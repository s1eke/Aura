import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * Calculate MD5 hash from a Buffer
 */
export function calculateMD5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Calculate MD5 hash from a file
 */
export async function calculateFileMD5(filepath: string): Promise<string> {
    const buffer = await fs.readFile(filepath);
    return calculateMD5(buffer);
}
