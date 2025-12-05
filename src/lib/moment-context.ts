import { logger } from './logger';
import { prisma } from './prisma';
import { describeImage } from './vision';

// Type for moment with all relations included
type MomentWithRelations = {
    id: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    images: Array<{
        id: string;
        momentId: string;
        imageId: string;
        order: number;
        image: {
            id: string;
            filepath: string;
            visionDescription: string | null;
            createdAt: Date;
        };
    }>;
    likes: Array<{
        id: string;
        momentId: string;
        userId: string | null;
        personaId: string | null;
        createdAt: Date;
        user: {
            username: string;
        } | null;
        persona: {
            name: string;
        } | null;
    }>;
    comments: Array<{
        id: string;
        momentId: string;
        userId: string | null;
        personaId: string | null;
        content: string;
        createdAt: Date;
        user: {
            username: string;
        } | null;
        persona: {
            name: string;
        } | null;
    }>;
    interactions?: Array<{
        id: string;
        momentId: string;
        personaId: string;
        hasReacted: boolean;
        reactedAt: Date | null;
        createdAt: Date;
    }>;
};

/**
 * Get moments that a persona hasn't processed yet
 */
export async function getUnprocessedMoments(userId: string, personaId: string) {
    try {
        // Get all moments from this user
        const moments = await prisma.moment.findMany({
            where: {
                userId,
            },
            include: {
                images: {
                    include: {
                        image: true,
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
                likes: {
                    include: {
                        user: {
                            select: {
                                username: true,
                            },
                        },
                        persona: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                username: true,
                            },
                        },
                        persona: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                interactions: {
                    where: {
                        personaId,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Filter moments that haven't been processed by this persona
        const unprocessedMoments = moments.filter(
            (moment) => !moment.interactions || moment.interactions.length === 0 || !moment.interactions[0].hasReacted
        );

        return unprocessedMoments;
    } catch (error) {
        logger.error('Error getting unprocessed moments:', error);
        return [];
    }
}

import OpenAI from 'openai';

/**
 * Format a moment for AI context
 */
export async function formatMomentForAI(
    moment: MomentWithRelations,
    client: OpenAI,
    visionModelName: string = 'gpt-4-vision-preview',
    options: { includeInteractions: boolean } = { includeInteractions: true }
) {
    let formattedText = `【用户的新动态】\n`;
    formattedText += `发布时间: ${moment.createdAt.toLocaleString('zh-CN')}\n`;
    formattedText += `内容: ${moment.content}\n`;

    // Add image descriptions if any
    if (moment.images && moment.images.length > 0) {
        formattedText += `\n包含图片:\n`;
        for (let i = 0; i < moment.images.length; i++) {
            const momentImage = moment.images[i];
            const image = momentImage.image;

            // Get or generate vision description
            let description = '';
            if (image.visionDescription) {
                description = image.visionDescription;
            } else {
                // Generate description using vision model
                const imagePath = image.filepath;
                description = await describeImage(imagePath, client, image.id, visionModelName);
            }

            formattedText += `图片${i + 1}: ${description}\n`;
        }
    }

    // Only include interactions (likes/comments) if enabled
    if (options.includeInteractions) {
        // Add existing likes if any
        if (moment.likes && moment.likes.length > 0) {
            const likeNames = moment.likes
                .map((like): string | undefined =>
                    like.user?.username || like.persona?.name
                )
                .filter((name): name is string => Boolean(name));

            if (likeNames.length > 0) {
                formattedText += `\n已有点赞（注意这里全部都是姓名）: ${likeNames.join('、')}\n`;
            }
        }

        // Add existing comments if any
        if (moment.comments && moment.comments.length > 0) {
            formattedText += `\n已有评论:\n`;
            for (const comment of moment.comments) {
                const commenter = comment.user?.username || comment.persona?.name;
                formattedText += `  - ${commenter}: ${comment.content}\n`;
            }
        }
    }

    return formattedText;
}

/**
 * Parse AI response to extract moment actions
 * Expected format: MOMENT_ACTIONS: [LIKE] [COMMENT: "comment text"] [DISCUSS]
 * Can be on one line or spread across multiple lines
 */
export function parseAIActions(aiResponse: string): {
    like: boolean;
    comment: string | null;
    discuss: boolean;
} {
    const result = {
        like: false,
        comment: null as string | null,
        discuss: false,
    };

    // Look for MOMENT_ACTIONS marker (might be on its own line or have content after it)
    if (!/MOMENT_ACTIONS:/i.test(aiResponse)) {
        return result;
    }

    // Extract everything after MOMENT_ACTIONS: until we hit two newlines or end of string
    // This handles both single-line and multi-line formats
    const actionSectionMatch = aiResponse.match(/MOMENT_ACTIONS:\s*([\s\S]*?)(?:\n\n|$)/i);

    if (!actionSectionMatch) {
        return result;
    }

    const actionsText = actionSectionMatch[1];

    // Check for LIKE
    if (/\[LIKE\]/i.test(actionsText)) {
        result.like = true;
    }

    // Check for COMMENT - handle both single and double quotes, and potential newlines
    // Improved regex to handle:
    // [COMMENT: "content"]
    // [COMMENT: 'content']
    // [COMMENT: content]
    const commentMatch = actionsText.match(/\[COMMENT:\s*(?:["'“]([\s\S]*?)["'”]|([\s\S]*?))\]/i);
    if (commentMatch) {
        // match[1] is quoted content, match[2] is unquoted content
        const rawComment = commentMatch[1] || commentMatch[2];
        if (rawComment) {
            result.comment = rawComment.trim();
        }
    }

    // Check for DISCUSS
    if (/\[DISCUSS\]/i.test(actionsText)) {
        result.discuss = true;
    }

    logger.debug('Parsed AI actions:', result, 'from text:', actionsText);

    return result;
}

/**
 * Execute AI's chosen actions on a moment
 */
export async function executeAIActions(
    momentId: string,
    personaId: string,
    actions: { like: boolean; comment: string | null; discuss: boolean }
) {
    try {
        // Get the moment to know who to notify
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
        });

        if (!moment) {
            logger.error(`Moment ${momentId} not found`);
            return false;
        }

        // Execute LIKE action
        if (actions.like) {
            // Check if persona already liked this moment
            const existingLike = await prisma.momentLike.findUnique({
                where: {
                    momentId_personaId: {
                        momentId,
                        personaId,
                    },
                },
            });

            if (!existingLike) {
                await prisma.momentLike.create({
                    data: {
                        momentId,
                        personaId,
                    },
                });
                logger.debug(`Persona ${personaId} liked moment ${momentId}`);

                // Create notification for moment owner
                await prisma.notification.create({
                    data: {
                        userId: moment.userId,
                        type: 'LIKE',
                        sourcePersonaId: personaId,
                        momentId: momentId,
                    },
                });
                logger.debug(`Created notification for persona like`);
            }
        }

        // Execute COMMENT action
        if (actions.comment) {
            // Fetch user's allowActionDescription setting from any chat session with this persona
            // (All sessions should have the same user, so any session will give us the user's preference)
            const userSession = await prisma.chatSession.findFirst({
                where: { personaId },
                select: { allowActionDescription: true },
            });

            const allowActionDesc = userSession?.allowActionDescription ?? true;

            // Import and apply the filter
            const { filterLLMOutput } = await import('./llm-filter');
            const filteredComment = filterLLMOutput(actions.comment, allowActionDesc);

            await prisma.momentComment.create({
                data: {
                    momentId,
                    personaId,
                    content: filteredComment,
                },
            });
            logger.debug(`Persona ${personaId} commented on moment ${momentId}: ${filteredComment}`);

            // Create notification for moment owner
            await prisma.notification.create({
                data: {
                    userId: moment.userId,
                    type: 'COMMENT',
                    content: filteredComment,
                    sourcePersonaId: personaId,
                    momentId: momentId,
                },
            });
            logger.debug(`Created notification for persona comment`);
        }

        // Mark moment as processed by this persona
        const existingInteraction = await prisma.momentInteraction.findUnique({
            where: {
                momentId_personaId: {
                    momentId,
                    personaId,
                },
            },
        });

        if (existingInteraction) {
            await prisma.momentInteraction.update({
                where: { id: existingInteraction.id },
                data: {
                    hasReacted: true,
                    reactedAt: new Date(),
                },
            });
        } else {
            await prisma.momentInteraction.create({
                data: {
                    momentId,
                    personaId,
                    hasReacted: true,
                    reactedAt: new Date(),
                },
            });
        }

        return true;
    } catch (error) {
        logger.error('Error executing AI actions:', error);
        return false;
    }
}

/**
 * Remove MOMENT_ACTIONS line from AI response for clean display
 */
export function cleanAIResponse(aiResponse: string): string {
    return aiResponse.replace(/MOMENT_ACTIONS:\s*.+?(?:\n|$)/i, '').trim();
}

/**
 * Detect if user is mentioning moments in their message
 */
export function detectMomentMention(userMessage: string): boolean {
    const keywords = [
        '动态',
        '朋友圈',
        '发的',
        '我发了',
        '看到了吗',
        '看到我',
    ];

    return keywords.some((keyword) => userMessage.includes(keyword));
}
