import path from 'path';
import fs from 'fs/promises';

/**
 * Get upload directory path for a given date
 * Format: /uploads/YYYY/MM/DD/
 */
export function getUploadDirectory(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `/uploads/${year}/${month}/${day}`;
}

/**
 * Get absolute upload directory path and ensure it exists
 */
export async function ensureUploadDirectory(date: Date = new Date()): Promise<string> {
    const relativeDir = getUploadDirectory(date);
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

    // Create directory recursively if it doesn't exist
    await fs.mkdir(absoluteDir, { recursive: true });

    return relativeDir;
}

/**
 * Get full file path in upload directory
 */
export function getUploadFilePath(filename: string, date: Date = new Date()): string {
    const dir = getUploadDirectory(date);
    return `${dir}/${filename}`;
}
