import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createOpenAIClient } from '@/lib/openai';
import fs from 'fs';
import path from 'path';
import { describeImage } from '@/lib/vision';
import { filterLLMOutput } from '@/lib/llm-filter';
import {
    getUnprocessedMoments,
    formatMomentForAI,
    parseAIActions,
    executeAIActions,
    detectMomentMention,
} from '@/lib/moment-context';
import {
    shouldTriggerSummarization,
    createSessionMemory,
} from '@/lib/memory';
import { logger } from '@/lib/logger';

// GET /api/sessions/[id]/messages - Get all messages for a session
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Verify session ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        const messages = await prisma.message.findMany({
            where: {
                sessionId: id,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json({ messages });
    } catch (error) {
        logger.error('Get messages error:', error);
        return NextResponse.json(
            { error: '获取消息失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/sessions/[id]/messages - Clear all messages in a session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Verify session ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        // Soft delete all messages in the session
        await prisma.message.updateMany({
            where: {
                sessionId,
            },
            data: {
                isDeleted: true,
            },
        });

        // Also clear memory if needed? Maybe we should keep memory but clearer context is better.
        // User asked to clear context for LLM, so soft deleting messages achieves that for future requests.
        // If we want to clear memories too:
        // await prisma.sessionMemory.deleteMany({ where: { sessionId } }); 
        // But user request specifically said "clear chat history", usually implies messages.
        // I will stick to messages as requested.

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Clear messages error:', error);
        return NextResponse.json(
            { error: '清除消息失败' },
            { status: 500 }
        );
    }
}

// POST /api/sessions/[id]/messages - Send a message and stream AI response
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const { content, imageUrl, imageId } = body;

        // Fetch user's API settings directly from database (session has masked values)
        const userId = session.user.id;
        const userSettings = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                apiKey: true,
                apiBaseUrl: true,
                llmModel: true,
                visionModel: true,
                momentMode: true,
            }
        });

        if (!userSettings || !userSettings.apiKey) {
            return NextResponse.json(
                { error: '请先在"我-偏好设置-API设置"中配置API Key' },
                { status: 400 }
            );
        }

        const openai = createOpenAIClient(userSettings.apiKey, userSettings.apiBaseUrl || undefined);
        const visionModelName = userSettings.visionModel || 'gpt-4-vision-preview';
        const llmModelName = userSettings.llmModel || 'gpt-4o-mini';

        if (!content || !content.trim()) {
            // Allow empty content if imageUrl is provided
            if (!imageUrl) {
                return NextResponse.json(
                    { error: '消息不能为空' },
                    { status: 400 }
                );
            }
        }

        // Verify session ownership and get persona
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
            include: {
                persona: true,
                memories: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // Get last 1 memory (rolling update)
                },
            },
            // Ensure we get all fields including allowActionDescription
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        // Check if session is blacklisted
        const isBlockedSession = chatSession.isBlacklisted;

        // Get context messages based on session settings
        const contextSize = chatSession.contextSize || 10;
        const recentMessages = await prisma.message.findMany({
            where: {
                sessionId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: contextSize,
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        // Check if session is blacklisted (already checked above)
        // if (chatSession.isBlacklisted) ...

        // Save user message
        const userMessage = await prisma.message.create({
            data: {
                content: content || '',
                role: 'user',
                sessionId,
                userId: session.user.id,
                imageUrl: imageUrl || null,
                imageId: imageId || null,
                isBlocked: isBlockedSession,
            },
        });

        // If blocked, return immediately without AI processing
        if (isBlockedSession) {
            return NextResponse.json({
                message: userMessage,
                status: 'blocked'
            });
        }



        // If message contains an image, ensure vision description is ready
        let imageDescription = '';
        if (imageUrl && imageId) {
            // Get the image record with filepath for potential analysis
            const image = await prisma.image.findUnique({
                where: { id: imageId },
                select: {
                    visionDescription: true,
                    filepath: true
                }
            });

            if (!image) {
                logger.error('Image not found in database:', imageId);
                imageDescription = '[图片不存在]';
            } else if (image.visionDescription) {
                // Use cached description
                imageDescription = image.visionDescription;
                logger.info('✓ Vision description from cache:', imageDescription);
            } else {
                // Description not ready yet, wait for vision model analysis
                logger.info('⏳ Vision description not cached, analyzing image now...');
                imageDescription = await describeImage(
                    image.filepath,
                    openai,
                    imageId,
                    visionModelName
                );
                logger.info('✓ Vision analysis completed:', imageDescription);
            }
        }

        // Get persona info before moment/memory processing
        const persona = await prisma.persona.findUnique({
            where: { id: chatSession.personaId },
        });

        if (!persona) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }

        // Check for unprocessed moments
        const personaId = chatSession.personaId;
        const unprocessedMoments = await getUnprocessedMoments(userId, personaId);

        // Also check if user is mentioning moments
        const isMentioningMoments = detectMomentMention(content || '');

        // Prepare moment context if needed
        let momentContext = '';
        let momentToProcess: Awaited<ReturnType<typeof getUnprocessedMoments>>[number] | null = null;

        if (unprocessedMoments.length > 0) {
            // Process the most recent unprocessed moment
            momentToProcess = unprocessedMoments[0];
            momentContext = await formatMomentForAI(
                momentToProcess,
                openai,
                visionModelName,
                { includeInteractions: !userSettings.momentMode }
            );
        } else if (isMentioningMoments) {
            // If user mentions moments, include recent moments
            const recentMoments = await prisma.moment.findMany({
                where: { userId },
                include: {
                    images: {
                        include: { image: true },
                        orderBy: { order: 'asc' },
                    },
                    likes: { include: { user: true, persona: true } },
                    comments: { include: { user: true, persona: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
            });

            if (recentMoments.length > 0) {
                momentContext = `\n\n【用户提到了动态，这是用户最近的动态】\n` + await formatMomentForAI(
                    recentMoments[0],
                    openai,
                    visionModelName,
                    { includeInteractions: !userSettings.momentMode }
                );
            }
        }

        // Read system prompt enhancement from file (read on every request for hot updates)
        let systemPromptTemplate = '';
        let momentDecisionPromptTemplate = '';
        try {
            const promptPath = path.join(process.cwd(), 'src/lib/prompts/system_enhancement.txt');
            systemPromptTemplate = fs.readFileSync(promptPath, 'utf-8');

            const decisionPromptPath = path.join(process.cwd(), 'src/lib/prompts/moment_decision.txt');
            momentDecisionPromptTemplate = fs.readFileSync(decisionPromptPath, 'utf-8');
        } catch (error) {
            logger.error('Failed to read prompt files:', error);
        }

        // Prepare variable replacements
        // Get memory content if exists and enabled
        const memoryContent = (chatSession.memoryEnabled && chatSession.memories.length > 0)
            ? chatSession.memories[0].content
            : '暂无记忆';

        const variables: Record<string, string> = {
            PERSONA_NAME: persona.name,
            PERSONA_GENDER: persona.gender || '',
            PERSONA_DESCRIPTION: persona.description || persona.instruction || '',
            PERSONA_STYLE: persona.style || '',
            PERSONA_CATCHPHRASES: persona.catchphrases || '',
            USER_NICKNAME: session.user?.name || '用户',
            MEMORY: memoryContent,
        };

        // 1. Handle Moment Decision (Pre-chat)
        let momentContextForChat = '';

        if (momentToProcess) {
            // Prepare decision prompt with system enhancement as base
            let decisionContent = momentDecisionPromptTemplate;

            // First, inject the system enhancement content
            let systemEnhancementContent = systemPromptTemplate;
            Object.entries(variables).forEach(([key, value]) => {
                systemEnhancementContent = systemEnhancementContent.replace(`{${key}}`, value);
            });
            decisionContent = decisionContent.replace('{SYSTEM_ENHANCEMENT}', systemEnhancementContent);

            // Then replace moment content
            const momentContentStr = momentContext;
            decisionContent = decisionContent.replace('{MOMENT_CONTENT}', momentContentStr);

            // Call AI for decision (Non-streaming)
            logger.debug('--- [DEBUG] Moment Decision Prompt ---');
            logger.debug(decisionContent);
            logger.debug('--------------------------------------');

            try {
                const decisionCompletion = await openai.chat.completions.create({
                    model: llmModelName,
                    messages: [{ role: 'system', content: decisionContent }],
                    temperature: 0.7,
                });

                const decisionResponse = decisionCompletion.choices[0]?.message?.content || '';
                logger.debug('--- [DEBUG] Moment Decision Response ---');
                logger.debug(decisionResponse);
                logger.debug('----------------------------------------');

                // Parse and execute actions
                const actions = parseAIActions(decisionResponse);

                // Execute actions
                if (actions.like || actions.comment) {
                    await executeAIActions(momentToProcess.id, chatSession.personaId, actions);
                }

                // Mark as processed regardless of action
                await prisma.momentInteraction.upsert({
                    where: {
                        momentId_personaId: {
                            momentId: momentToProcess.id,
                            personaId: chatSession.personaId,
                        },
                    },
                    update: {
                        hasReacted: true,
                        reactedAt: new Date(),
                    },
                    create: {
                        momentId: momentToProcess.id,
                        personaId: chatSession.personaId,
                        hasReacted: true,
                        reactedAt: new Date(),
                    },
                });

                // Prepare context for main chat
                momentContextForChat = `\n\n【动态交互上下文】\n用户刚刚发布/提到了这条动态：\n${momentContentStr}\n\n针对这条动态，你刚刚的操作是：\n`;
                if (actions.like) momentContextForChat += "- 你点赞了这条动态\n";
                if (actions.comment) momentContextForChat += `- 你评论了："${actions.comment}"\n`;
                if (!actions.like && !actions.comment) momentContextForChat += "- 你看过了，但决定暂时不点赞也不评论\n";

            } catch (error) {
                logger.error('Moment decision error:', error);
            }
        }

        // 2. Main Chat Flow

        // Replace variables in system prompt
        let systemContent = systemPromptTemplate;
        Object.entries(variables).forEach(([key, value]) => {
            systemContent = systemContent.replace(`{${key}}`, value);
        });

        // Clean up empty lines
        systemContent = systemContent
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return !(trimmed.endsWith('：') || trimmed.endsWith(':'));
            })
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');

        // Add moment context to system message if present
        if (momentContextForChat) {
            systemContent += momentContextForChat;
        } else if (momentContext) { // Fallback to general moment context if no decision was made
            systemContent += '\n\n' + momentContext;
        }

        const systemMessage = {
            role: 'system' as const,
            content: systemContent,
        };

        // Build message history from recent messages (in chronological order)
        // Merge consecutive assistant messages to save tokens
        const rawMessages = recentMessages.reverse();
        const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        for (let i = 0; i < rawMessages.length; i++) {
            const msg = rawMessages[i];
            const role = msg.role as 'user' | 'assistant';

            if (role === 'assistant' && historyMessages.length > 0 && historyMessages[historyMessages.length - 1].role === 'assistant') {
                // Merge with previous assistant message
                historyMessages[historyMessages.length - 1].content += msg.content;
            } else {
                // Add as new message
                historyMessages.push({
                    role,
                    content: msg.content,
                });
            }
        }

        // Memory is now integrated into system prompt via {MEMORY} variable
        // No need for separate memory messages

        // Add current user message with image description if present
        const currentUserContent = imageDescription
            ? `[用户发送了一张图片]\n图片描述: ${imageDescription}\n${content ? `\n用户补充: ${content}` : ''}`
            : content;

        const userMessageForContext = {
            role: 'user' as const,
            content: currentUserContent,
        };


        // Simulate typing delay (1s - 3s)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Create SSE stream
        const encoder = new TextEncoder();

        return new NextResponse(new ReadableStream({
            async start(controller) {
                try {
                    // 0. Send the user message back first so client can update ID
                    const userMsgData = `data: ${JSON.stringify({ type: 'message', message: { ...userMessage, status: 'sent' } })}\n\n`;
                    controller.enqueue(encoder.encode(userMsgData));

                    // Build full context: system + history + current message
                    const fullContext = [
                        systemMessage,
                        ...historyMessages,
                        userMessageForContext
                    ];
                    logger.debug('--- [DEBUG] Chat Context ---');
                    logger.debug(JSON.stringify(fullContext, null, 2));
                    logger.debug('----------------------------');

                    const completion = await openai.chat.completions.create({
                        model: llmModelName,
                        messages: fullContext,
                        stream: true,
                    });

                    let buffer = '';
                    let originalResponse = ''; // Track original unfiltered response
                    let fullResponse = ''; // Track filtered response
                    const delimiters = /[。！？!?~\n]/;

                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            // Track original response before filtering
                            originalResponse += content;

                            // Apply LLM output filter before adding to buffer
                            const filteredContent = filterLLMOutput(content, chatSession.allowActionDescription);
                            buffer += filteredContent;
                            fullResponse += filteredContent;

                            // Check for delimiters
                            let match;
                            while ((match = buffer.match(delimiters)) !== null) {
                                const index = match.index! + 1;
                                let sentence = buffer.slice(0, index);
                                buffer = buffer.slice(index);

                                sentence = sentence.trim();

                                // Filter out noise messages (only punctuation/symbols)
                                // Matches lines that are just: . ! ? 。 ！ ？ [ ] ( ) and whitespace
                                const isNoise = /^[。！？.!?\[\]\(\)\s]+$/.test(sentence);

                                if (sentence && !isNoise) {
                                    // Simulate typing time for this sentence
                                    // Base delay 500ms + 50ms per character, capped at 2.5s
                                    const typingDelay = Math.min(2500, 500 + sentence.length * 80);
                                    await new Promise(resolve => setTimeout(resolve, typingDelay));

                                    // Save to DB
                                    const message = await prisma.message.create({
                                        data: {
                                            content: sentence,
                                            role: 'assistant',
                                            sessionId,
                                            userId: session.user.id,
                                        },
                                    });

                                    // Send to client
                                    const data = `data: ${JSON.stringify({ type: 'message', message })}\n\n`;
                                    controller.enqueue(encoder.encode(data));
                                }
                            }
                        }
                    }

                    // Process remaining buffer
                    if (buffer.trim()) {
                        const message = await prisma.message.create({
                            data: {
                                content: buffer.trim(),
                                role: 'assistant',
                                sessionId,
                                userId: session.user.id,
                            },
                        });
                        const data = `data: ${JSON.stringify({ type: 'message', message })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }

                    logger.debug('--- [DEBUG] AI Original Response (Before Filter) ---');
                    logger.debug(originalResponse);
                    logger.debug('-----------------------------------------------------');
                    logger.debug('--- [DEBUG] AI Filtered Response (After Filter) ---');
                    logger.debug(fullResponse);
                    logger.debug('----------------------------------------------------');

                    // Update session timestamp
                    await prisma.chatSession.update({
                        where: { id: sessionId },
                        data: { updatedAt: new Date() },
                    });

                    const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
                    controller.enqueue(encoder.encode(doneData));
                    controller.close();

                    // Check if auto-summarization should be triggered
                    if (chatSession.memoryEnabled) {
                        const shouldSummarize = await shouldTriggerSummarization(sessionId);
                        if (shouldSummarize) {
                            logger.info('[Memory] Auto-summarization triggered');
                            try {
                                await createSessionMemory(openai, sessionId, llmModelName);
                                logger.info('[Memory] Auto-summarization completed');
                            } catch (error) {
                                logger.error('[Memory] Auto-summarization failed:', error);
                            }
                        }
                    }

                } catch (error) {
                    logger.error('Stream error:', error);
                    const errorData = `data: ${JSON.stringify({ error: 'AI响应失败' })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            }
        }), {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        logger.error('Send message error:', error);
        return NextResponse.json(
            { error: '发送消息失败' },
            { status: 500 }
        );
    }
}
