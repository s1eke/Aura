import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Compress an image to be under 500KB and return base64 string
 */
async function compressImageToBase64(imagePath: string): Promise<string> {
    try {
        const fullPath = path.join(process.cwd(), 'public', imagePath);
        const imageBuffer = await fs.readFile(fullPath);

        let quality = 95;
        let compressedBuffer = Buffer.from(imageBuffer);
        let compressedSize = imageBuffer.length;

        const targetSize = 500 * 1024; // 500KB

        // Only compress if larger than 500KB
        if (compressedSize > targetSize) {
            const image = sharp(Uint8Array.from(imageBuffer));
            const metadata = await image.metadata();

            // Try compressing with decreasing quality until under 500KB
            while (quality > 10 && compressedSize > targetSize) {
                try {
                    compressedBuffer = Buffer.from(await sharp(Uint8Array.from(imageBuffer))
                        .jpeg({ quality })
                        .toBuffer());

                    compressedSize = compressedBuffer.length;

                    if (compressedSize > targetSize) {
                        quality -= 5;
                    }
                } catch (err) {
                    logger.error('Compression error at quality', quality, err);
                    break;
                }
            }

            // If still too large, resize the image
            if (compressedSize > targetSize) {
                let width = metadata.width || 1920;
                let height = metadata.height || 1080;

                while (compressedSize > targetSize && width > 400) {
                    width = Math.floor(width * 0.8);
                    height = Math.floor(height * 0.8);

                    compressedBuffer = Buffer.from(await sharp(Uint8Array.from(imageBuffer))
                        .resize(width, height, { fit: 'inside' })
                        .jpeg({ quality: 85 })
                        .toBuffer());

                    compressedSize = compressedBuffer.length;
                }
            }

            logger.debug(`Image compressed: ${imageBuffer.length} -> ${compressedSize} bytes (${Math.round(compressedSize / 1024)}KB)`);
        }

        // Convert to base64
        const base64 = compressedBuffer.toString('base64');
        const mimeType = 'image/jpeg';

        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        logger.error('Error compressing image:', error);
        throw error;
    }
}

/**
 * @param client - Initialized OpenAI client
 * @param imageId - Optional ID of the image record in database for caching
 * @param modelName - Optional model name to use (default: gpt-4-vision-preview)
 * @returns Description of the image content
 */
export async function describeImage(imagePath: string, client: OpenAI, imageId?: string, modelName: string = 'gpt-4-vision-preview'): Promise<string> {
    try {
        // 1. Check cache if imageId is provided
        if (imageId) {
            const cachedImage = await prisma.image.findUnique({
                where: { id: imageId },
                select: { visionDescription: true }
            });

            if (cachedImage?.visionDescription) {
                logger.debug('Using cached vision description');
                return cachedImage.visionDescription;
            }
        }

        // 2. Compress and convert image to base64
        const base64Image = await compressImageToBase64(imagePath);

        const response = await client.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: '角色：​ 你是一个图像描述生成器，输出将直接作为另一LLM的输入。\n核心指令：​ 对图片进行客观、结构化描述。只描述视觉事实，避免使用“图片中”、“可以看到”等词。直接描述内容。\n描述结构：\n概要：​ 用一句话总结核心内容（主体、场景、关键动作）。\n细节：​ 按重要性描述主体、其他关键元素及其互动。\n视觉风格：​ 简要说明构图、色彩、光线和整体风格。\n输出要求：​ 语言简洁，直接描述，无需推测。',
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64Image,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const description = response.choices[0]?.message?.content || '无法描述图片';

        // 3. Save to cache if imageId is provided
        if (imageId && description !== '无法描述图片') {
            await prisma.image.update({
                where: { id: imageId },
                data: {
                    visionDescription: description,
                    visionModelName: modelName,
                    visionAnalyzedAt: new Date(),
                }
            });
        }

        return description;
    } catch (error) {
        logger.error('Vision model error:', error);
        return '[图片发送失败]';
    }
}
