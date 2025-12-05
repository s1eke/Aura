import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const stickersDir = path.join(process.cwd(), 'public', 'stickers');

        // Check if stickers directory exists
        if (!fs.existsSync(stickersDir)) {
            return NextResponse.json({ categories: [] });
        }

        const categories: { name: string; stickers: string[] }[] = [];
        const categoryDirs = fs.readdirSync(stickersDir, { withFileTypes: true });

        for (const dir of categoryDirs) {
            if (dir.isDirectory()) {
                const categoryPath = path.join(stickersDir, dir.name);
                const files = fs.readdirSync(categoryPath);

                // Filter for image files
                const stickers = files
                    .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
                    .map(file => `/stickers/${dir.name}/${file}`);

                if (stickers.length > 0) {
                    categories.push({
                        name: dir.name,
                        stickers
                    });
                }
            }
        }

        return NextResponse.json({ categories });
    } catch (error) {
        logger.error('Failed to load stickers:', error);
        return NextResponse.json({ categories: [] });
    }
}
