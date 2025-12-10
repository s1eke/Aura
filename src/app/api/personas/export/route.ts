import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import archiver from 'archiver';
import { existsSync } from 'fs';
import { join } from 'path';

// POST /api/personas/export - Export a persona as ZIP file
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const { personaId, mode } = body;

        if (!personaId) {
            return NextResponse.json(
                { error: '缺少角色ID' },
                { status: 400 }
            );
        }

        if (!mode || (mode !== 'settings' && mode !== 'full')) {
            return NextResponse.json(
                { error: '导出模式必须是 settings 或 full' },
                { status: 400 }
            );
        }

        // Fetch persona with ownership verification
        const persona = await prisma.persona.findUnique({
            where: {
                id: personaId,
                userId: session.user.id,
            },
        });

        if (!persona) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }

        logger.info(`[Persona Export] Exporting persona ${personaId} in ${mode} mode`);

        // Find the chat session for this persona
        const chatSession = await prisma.chatSession.findFirst({
            where: {
                personaId: personaId,
                userId: session.user.id,
            },
        });

        // Fetch memories
        const memories: Array<{
            content: string;
            messageCount: number;
            createdAt: string;
        }> = [];

        if (chatSession) {
            const sessionMemories = await prisma.sessionMemory.findMany({
                where: {
                    sessionId: chatSession.id,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            memories.push(...sessionMemories.map(m => ({
                content: m.content,
                messageCount: m.messageCount,
                createdAt: m.createdAt.toISOString(),
            })));
        }

        // Build export data
        const exportData: {
            version: string;
            exportMode: 'settings' | 'full';
            exportedAt: string;
            persona: {
                name: string;
                hasAvatar: boolean;
                gender: string | null;
                description: string | null;
                style: string | null;
                catchphrases: string | null;
                greeting: string | null;
                instruction: string;
            };
            background: {
                hasBgImage: boolean;
                bgMode: string;
            };
            memories: Array<{
                content: string;
                messageCount: number;
                createdAt: string;
            }>;
            messages?: Array<{
                content: string;
                role: string;
                createdAt: string;
                isBlocked: boolean;
                imageIndex?: number;
            }>;
        } = {
            version: '1.0',
            exportMode: mode,
            exportedAt: new Date().toISOString(),
            persona: {
                name: persona.name,
                hasAvatar: !!persona.avatar,
                gender: persona.gender,
                description: persona.description,
                style: persona.style,
                catchphrases: persona.catchphrases,
                greeting: persona.greeting,
                instruction: persona.instruction,
            },
            background: {
                hasBgImage: !!chatSession?.bgImage,
                bgMode: chatSession?.bgMode || 'cover',
            },
            memories: memories,
        };

        // Collect image files for full mode
        const imageFiles: Array<{ path: string; index: number }> = [];

        // If full mode, include messages
        if (mode === 'full' && chatSession) {
            const messages = await prisma.message.findMany({
                where: {
                    sessionId: chatSession.id,
                    isDeleted: false,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            exportData.messages = messages.map((m) => {
                const msgData: {
                    content: string;
                    role: string;
                    createdAt: string;
                    isBlocked: boolean;
                    imageIndex?: number;
                } = {
                    content: m.content,
                    role: m.role,
                    createdAt: m.createdAt.toISOString(),
                    isBlocked: m.isBlocked,
                };

                // If message has an image, track it
                if (m.imageUrl) {
                    const imagePath = join(process.cwd(), 'public', m.imageUrl);
                    if (existsSync(imagePath)) {
                        msgData.imageIndex = imageFiles.length;
                        imageFiles.push({ path: imagePath, index: imageFiles.length });
                    }
                }

                return msgData;
            });

            logger.info(`[Persona Export] Exporting ${messages.length} messages with ${imageFiles.length} images`);
        }

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Handle archiver errors
        archive.on('error', (err) => {
            logger.error('[Persona Export] Archiver error:', err);
            throw err;
        });

        // Add persona.json
        archive.append(JSON.stringify(exportData, null, 2), {
            name: 'persona.json'
        });

        // Add avatar if exists
        if (persona.avatar) {
            const avatarPath = join(process.cwd(), 'public', persona.avatar);
            if (existsSync(avatarPath)) {
                const ext = persona.avatar.split('.').pop() || 'png';
                archive.file(avatarPath, { name: `avatar.${ext}` });
                logger.info(`[Persona Export] Adding avatar: avatar.${ext}`);
            }
        }

        // Add background image if exists
        if (chatSession?.bgImage) {
            const bgImagePath = join(process.cwd(), 'public', chatSession.bgImage);
            if (existsSync(bgImagePath)) {
                const ext = chatSession.bgImage.split('.').pop() || 'jpg';
                archive.file(bgImagePath, { name: `background.${ext}` });
                logger.info(`[Persona Export] Adding background: background.${ext}`);
            }
        }

        // Add images for full mode
        if (mode === 'full' && imageFiles.length > 0) {
            imageFiles.forEach(({ path: imgPath, index }) => {
                if (existsSync(imgPath)) {
                    const ext = imgPath.split('.').pop() || 'jpg';
                    const filename = `images/msg_${index.toString().padStart(3, '0')}.${ext}`;
                    archive.file(imgPath, { name: filename });
                }
            });
            logger.info(`[Persona Export] Added ${imageFiles.length} images`);
        }

        // Finalize the archive
        await archive.finalize();

        // Generate filename
        const timestamp = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-');
        const filename = `${persona.name}_${timestamp}.zip`;

        // Convert archive to buffer for NextResponse
        const chunks: Uint8Array[] = [];
        for await (const chunk of archive) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        logger.info(`[Persona Export] Successfully exported persona ${persona.name} (${buffer.length} bytes)`);

        // Return ZIP file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (error) {
        logger.error('[Persona Export] Export failed:', error);
        return NextResponse.json(
            { error: '导出角色失败' },
            { status: 500 }
        );
    }
}
