// Allowed image MIME types for frontend validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Maximum file size (10MB)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate image file on the frontend
 */
export function validateImageFile(file: File): ImageValidationResult {
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
        return {
            valid: false,
            error: `图片大小超过限制（最大 ${MAX_IMAGE_SIZE / 1024 / 1024}MB）`,
        };
    }

    // Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: '不支持的图片格式，仅支持 JPG, PNG, GIF, WebP',
        };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            valid: false,
            error: '不支持的文件扩展名',
        };
    }

    return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
