import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import AdmZip from 'adm-zip';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// Type definition for import data
interface ImportData {
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
}

// Safe path validation to prevent directory traversal
function validateSafePath(basePath: string, targetPath: string): boolean {
    const normalized = path.normalize(targetPath);
    const resolved = path.resolve(basePath, normalized);
    return resolved.startsWith(path.resolve(basePath));
}

// POST /api/personas/import - Import a persona from ZIP file
export async function POST(request: NextRequest) {
    let tempDir: string | null = null;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Get uploaded file
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: '未找到上传文件' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.endsWith('.zip')) {
            return NextResponse.json(
                { error: '只支持ZIP文件' },
                { status: 400 }
            );
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'ZIP文件过大（最大100MB）' },
                { status: 400 }
            );
        }

        logger.info(`[Persona Import] Receiving ZIP file: ${file.name} (${file.size} bytes)`);

        const userId = session.user.id;

        // Verify user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });

        if (!userExists) {
            return NextResponse.json(
                { error: '用户不存在或会话已过期，请重新登录' },
                { status: 401 }
            );
        }

        // Create safe temp directory with UUID to ensure uniqueness
        const tempDirName = `persona_import_${randomUUID()}`;
        tempDir = path.join(tmpdir(), tempDirName);

        // Double-check the temp dir path is safe
        if (!validateSafePath(tmpdir(), tempDir)) {
            throw new Error('Invalid temp directory path');
        }

        await fs.mkdir(tempDir, { recursive: true });
        logger.info(`[Persona Import] Created temp directory: ${tempDir}`);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract ZIP
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();

        // Validate entry count (prevent zip bombs)
        if (zipEntries.length > 1000) {
            throw new Error('ZIP文件包含过多文件');
        }

        // Extract to temp directory with validation
        zipEntries.forEach(entry => {
            const entryPath = path.join(tempDir!, entry.entryName);

            // Validate path safety
            if (!validateSafePath(tempDir!, entryPath)) {
                throw new Error(`Invalid file path in ZIP: ${entry.entryName}`);
            }

            // Skip directory entries
            if (entry.isDirectory) {
                return;
            }

            // Extract file
            zip.extractEntryTo(entry, tempDir!, true, true);
        });

        logger.info(`[Persona Import] Extracted ${zipEntries.length} files`);

        // Read and validate persona.json
        const personaJsonPath = path.join(tempDir, 'persona.json');
        if (!existsSync(personaJsonPath)) {
            throw new Error('ZIP文件中缺少persona.json');
        }

        const personaJsonContent = await fs.readFile(personaJsonPath, 'utf-8');
        let importData: ImportData;

        try {
            importData = JSON.parse(personaJsonContent);
        } catch {
            throw new Error('persona.json格式无效');
        }

        // Validate import data structure
        if (!importData.version || !importData.persona || !importData.persona.name) {
            throw new Error('导入数据格式错误：缺少必需字段');
        }

        if (importData.version !== '1.0') {
            logger.warn(`[Persona Import] Unsupported version: ${importData.version}`);
            return NextResponse.json(
                { error: `不支持的数据版本: ${importData.version}` },
                { status: 400 }
            );
        }

        logger.info(`[Persona Import] Importing persona: ${importData.persona.name}`);

        // Strict input validation to prevent injection
        const sanitizeString = (value: unknown, maxLength: number = 1000): string | null => {
            if (value === null || value === undefined) return null;
            if (typeof value !== 'string') return null;

            // Remove any potential script tags or dangerous HTML
            const sanitized = value
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, '') // Remove all HTML tags
                .trim();

            // Limit length
            return sanitized.substring(0, maxLength);
        };

        const validateRole = (role: unknown): 'user' | 'assistant' | null => {
            if (role === 'user' || role === 'assistant') return role;
            return null;
        };

        // Validate and sanitize persona fields
        const personaName = sanitizeString(importData.persona.name, 50);
        if (!personaName) {
            throw new Error('角色名称无效或为空');
        }

        const personaGender = sanitizeString(importData.persona.gender, 10);
        const personaDescription = sanitizeString(importData.persona.description, 2000);
        const personaStyle = sanitizeString(importData.persona.style, 200);
        const personaCatchphrases = sanitizeString(importData.persona.catchphrases, 200);
        const personaGreeting = sanitizeString(importData.persona.greeting, 500);
        const personaInstruction = sanitizeString(importData.persona.instruction, 5000) || '';

        // Process avatar if exists
        let avatarPath: string | null = null;
        if (importData.persona.hasAvatar) {
            const avatarFiles = zipEntries.filter(e =>
                !e.isDirectory && e.entryName.startsWith('avatar.'));

            if (avatarFiles.length > 0) {
                const avatarEntry = avatarFiles[0];
                const ext = avatarEntry.entryName.split('.').pop();

                // Validate image extension
                const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                if (ext && allowedExts.includes(ext.toLowerCase())) {
                    const avatarFilename = `import_${randomUUID()}.${ext}`;
                    const avatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
                    const avatarFullPath = path.join(avatarDir, avatarFilename);

                    await fs.mkdir(avatarDir, { recursive: true });
                    const avatarBuffer = zip.readFile(avatarEntry);
                    if (avatarBuffer) {
                        await fs.writeFile(avatarFullPath, avatarBuffer);
                        avatarPath = `/uploads/avatars/${avatarFilename}`;
                        logger.info(`[Persona Import] Avatar saved to ${avatarPath}`);
                    }
                }
            }
        }

        // Process background image if exists
        let bgImagePath: string | null = null;
        let bgMode = 'cover';

        if (importData.background && importData.background.hasBgImage) {
            const bgFiles = zipEntries.filter(e =>
                !e.isDirectory && e.entryName.startsWith('background.'));

            if (bgFiles.length > 0) {
                const bgEntry = bgFiles[0];
                const ext = bgEntry.entryName.split('.').pop();

                // Validate image extension
                const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                if (ext && allowedExts.includes(ext.toLowerCase())) {
                    const bgFilename = `bg_${randomUUID()}.${ext}`;
                    const bgDir = path.join(process.cwd(), 'public', 'uploads', 'backgrounds');
                    const bgFullPath = path.join(bgDir, bgFilename);

                    await fs.mkdir(bgDir, { recursive: true });
                    const bgBuffer = zip.readFile(bgEntry);
                    if (bgBuffer) {
                        await fs.writeFile(bgFullPath, bgBuffer);
                        bgImagePath = `/uploads/backgrounds/${bgFilename}`;
                        bgMode = importData.background.bgMode || 'cover';
                        logger.info(`[Persona Import] Background saved to ${bgImagePath}`);
                    }
                }
            }
        }

        // Create persona
        const persona = await prisma.persona.create({
            data: {
                name: personaName,
                avatar: avatarPath,
                gender: personaGender,
                description: personaDescription,
                style: personaStyle,
                catchphrases: personaCatchphrases,
                greeting: personaGreeting,
                instruction: personaInstruction,
                userId: userId,
            },
        });

        logger.info(`[Persona Import] Created persona with ID: ${persona.id}`);

        // Create chat session
        const chatSession = await prisma.chatSession.create({
            data: {
                userId: userId,
                personaId: persona.id,
                bgImage: bgImagePath,
                bgMode: bgMode,
            },
        });

        logger.info(`[Persona Import] Created chat session with ID: ${chatSession.id}`);

        // Import memories if present
        if (importData.memories && Array.isArray(importData.memories) && importData.memories.length > 0) {
            const validMemories = importData.memories
                .filter(m => m && typeof m === 'object' && m.content)
                .map(m => {
                    const content = sanitizeString(m.content, 5000);
                    const messageCount = typeof m.messageCount === 'number' &&
                        m.messageCount > 0 &&
                        m.messageCount < 10000
                        ? m.messageCount
                        : 1;

                    if (!content) return null;

                    return {
                        sessionId: chatSession.id,
                        content: content,
                        messageCount: messageCount,
                        createdAt: new Date(m.createdAt || new Date()),
                    };
                })
                .filter((m): m is NonNullable<typeof m> => m !== null);

            if (validMemories.length > 0) {
                await prisma.sessionMemory.createMany({
                    data: validMemories,
                });

                logger.info(`[Persona Import] Imported ${validMemories.length} memories`);
            }
        }

        // Import messages if present (full mode)
        if (importData.messages && Array.isArray(importData.messages) && importData.messages.length > 0) {
            const imageFiles = zipEntries.filter(e =>
                !e.isDirectory && e.entryName.startsWith('images/'));

            // Map to store imported image paths
            const imagePathMap = new Map<number, string>();

            // Import images first
            if (imageFiles.length > 0) {
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                await fs.mkdir(uploadsDir, { recursive: true });

                for (const imageEntry of imageFiles) {
                    const match = imageEntry.entryName.match(/msg_(\d+)\./);
                    if (match) {
                        const index = parseInt(match[1], 10);
                        const ext = imageEntry.entryName.split('.').pop();

                        // Validate image extension
                        const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                        if (ext && allowedExts.includes(ext.toLowerCase())) {
                            const imageFilename = `import_${randomUUID()}.${ext}`;
                            const imageFullPath = path.join(uploadsDir, imageFilename);

                            const imageBuffer = zip.readFile(imageEntry);
                            if (imageBuffer) {
                                await fs.writeFile(imageFullPath, imageBuffer);
                                imagePathMap.set(index, `/uploads/${imageFilename}`);
                            }
                        }
                    }
                }

                logger.info(`[Persona Import] Imported ${imagePathMap.size} images`);
            }

            // Validate and sanitize messages
            const validMessages = importData.messages
                .filter(m => m && typeof m === 'object' && m.content && m.role)
                .map(m => {
                    const content = sanitizeString(m.content, 10000);
                    const role = validateRole(m.role);

                    if (!content || !role) return null;

                    const messageData: {
                        sessionId: string;
                        userId: string;
                        content: string;
                        role: 'user' | 'assistant';
                        isBlocked: boolean;
                        imageUrl?: string;
                        createdAt: Date;
                    } = {
                        sessionId: chatSession.id,
                        userId: userId,
                        content: content,
                        role: role,
                        isBlocked: typeof m.isBlocked === 'boolean' ? m.isBlocked : false,
                        createdAt: new Date(m.createdAt || new Date()),
                    };

                    // Add image if exists
                    if (typeof m.imageIndex === 'number' && imagePathMap.has(m.imageIndex)) {
                        messageData.imageUrl = imagePathMap.get(m.imageIndex);
                    }

                    return messageData;
                })
                .filter((m): m is NonNullable<typeof m> => m !== null);

            if (validMessages.length > 0) {
                // Use createMany for messages without imageUrl, create individually for those with imageUrl
                for (const msg of validMessages) {
                    await prisma.message.create({
                        data: msg,
                    });
                }

                logger.info(`[Persona Import] Imported ${validMessages.length} messages`);
            }
        } else if (personaGreeting && personaGreeting.trim()) {
            // If no messages but greeting exists, send the greeting message
            await prisma.message.create({
                data: {
                    content: personaGreeting.trim(),
                    role: 'assistant',
                    sessionId: chatSession.id,
                    userId: userId,
                },
            });

            logger.info('[Persona Import] Created greeting message');
        }

        logger.info(`[Persona Import] Successfully imported persona: ${persona.name}`);

        return NextResponse.json({
            persona,
            sessionId: chatSession.id,
            message: '角色导入成功'
        }, { status: 201 });
    } catch (error) {
        logger.error('[Persona Import] Import failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '导入角色失败' },
            { status: 500 }
        );
    } finally {
        // CRITICAL: Safe cleanup of temp directory
        // Only delete if tempDir was created and is valid
        if (tempDir) {
            try {
                // Extra safety check: verify path is in temp directory
                const resolvedTempDir = path.resolve(tempDir);
                const sysTempDir = path.resolve(tmpdir());

                // Only delete if:
                // 1. Path exists
                // 2. Path starts with system temp directory
                // 3. Path contains our UUID pattern
                if (existsSync(resolvedTempDir) &&
                    resolvedTempDir.startsWith(sysTempDir) &&
                    resolvedTempDir.includes('persona_import_')) {

                    await fs.rm(resolvedTempDir, { recursive: true, force: true });
                    logger.info(`[Persona Import] Cleaned up temp directory: ${resolvedTempDir}`);
                } else {
                    logger.warn(`[Persona Import] Skipped cleanup of suspicious path: ${resolvedTempDir}`);
                }
            } catch (cleanupError) {
                logger.error('[Persona Import] Failed to cleanup temp directory:', cleanupError);
                // Don't throw - cleanup failure shouldn't fail the request if import succeeded
            }
        }
    }
}
