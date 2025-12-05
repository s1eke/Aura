import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateMD5 } from '@/lib/md5';
import { ensureUploadDirectory } from '@/lib/date-utils';
import { validateFileType, getExtensionFromMimeType } from '@/lib/file-validator';
import { createOpenAIClient } from '@/lib/openai';
import { describeImage } from '@/lib/vision';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        // Get fresh user settings for API key
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                apiKey: true,
                apiBaseUrl: true,
                visionModel: true
            }
        });

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Validate file type
        const validation = await validateFileType(buffer);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // 2. Calculate MD5
        const md5 = calculateMD5(buffer);

        // 3. Check for duplicates
        let image = await prisma.image.findUnique({
            where: { md5 },
        });

        // If newly uploaded or existing but missing description, we might want to process it
        let relativePath = '';
        let isDuplicate = false;

        if (image) {
            relativePath = image.filepath;
            isDuplicate = true;
        } else {
            // 4. Save new file
            // Use detected extension from validation for security
            const ext = getExtensionFromMimeType(validation.detectedType!);
            const filename = `${md5}${ext}`; // Use MD5 as filename to avoid collisions

            // Ensure directory exists: /uploads/YYYY/MM/DD/
            const relativeDir = await ensureUploadDirectory();
            relativePath = path.join(relativeDir, filename);
            const absolutePath = path.join(process.cwd(), 'public', relativePath);

            await writeFile(absolutePath, buffer);

            // 5. Create DB record
            image = await prisma.image.create({
                data: {
                    md5,
                    filepath: relativePath, // Store relative path for URL usage
                    filename: file.name,
                    mimetype: validation.detectedType!,
                    size: buffer.length,
                    uploadedBy: userId,
                },
            });
        }

        // 6. Trigger Vision Analysis in background (if apiKey present and description missing)
        // Don't await - let it run asynchronously and update DB when done
        if (user?.apiKey && (!image?.visionDescription || image.visionDescription === '无法描述图片')) {
            const openai = createOpenAIClient(user.apiKey, user.apiBaseUrl || undefined);
            const visionModel = user.visionModel || 'gpt-4-vision-preview';

            logger.info(`[Upload] Starting async vision analysis for ${image.id} using ${visionModel}`);

            // Fire and forget - don't await
            describeImage(relativePath, openai, image.id, visionModel)
                .then(() => {
                    logger.info(`[Upload] Vision analysis completed for ${image.id}`);
                })
                .catch((visionError) => {
                    logger.error('[Upload] Vision analysis failed:', visionError);
                });
        }

        return NextResponse.json({
            url: relativePath,
            imageId: image.id,
            isDuplicate
        });

    } catch (error) {
        logger.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
