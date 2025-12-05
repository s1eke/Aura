import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

import { logger } from '@/lib/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: filePath } = await params;

        // Reconstruct the full file path
        const fullPath = path.join(process.cwd(), 'public', 'uploads', ...filePath);

        // Check if file exists
        try {
            const stats = await stat(fullPath);
            if (!stats.isFile()) {
                return new NextResponse('Not Found', { status: 404 });
            }
        } catch {
            return new NextResponse('Not Found', { status: 404 });
        }

        // Read the file
        const fileBuffer = await readFile(fullPath);

        // Determine content type based on file extension
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Return the file with appropriate headers
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        logger.error('Error serving uploaded file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
