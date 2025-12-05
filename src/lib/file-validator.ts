import { logger } from './logger';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    detectedType?: string;
}

/**
 * Validate file by checking magic bytes (file header)
 * This prevents users from uploading malicious files with fake extensions
 */
export async function validateFileType(buffer: Buffer): Promise<FileValidationResult> {
    try {
        // Check file size
        if (buffer.length > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
            };
        }

        // Detect actual file type from magic bytes
        // Use dynamic import for file-type package (ESM-only module)
        const { fromBuffer } = await import('file-type');
        const fileType = await fromBuffer(buffer);

        if (!fileType) {
            return {
                valid: false,
                error: '无法识别文件类型',
            };
        }

        // Check if it's an allowed image type
        if (!ALLOWED_IMAGE_TYPES.includes(fileType.mime)) {
            return {
                valid: false,
                error: `不支持的文件类型：${fileType.mime}。仅支持 JPEG, PNG, GIF, WebP 图片`,
                detectedType: fileType.mime,
            };
        }

        return {
            valid: true,
            detectedType: fileType.mime,
        };
    } catch (error) {
        logger.error('File validation error:', error);
        return {
            valid: false,
            error: '文件验证失败',
        };
    }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
    };

    return mimeToExt[mimeType] || '.jpg';
}
