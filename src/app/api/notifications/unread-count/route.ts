import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint for polling - returns only unread notification count
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Count unread notifications
        const unreadNotifications = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        return NextResponse.json({
            unreadNotifications,
        });
    } catch (error) {
        logger.error('Failed to fetch counts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch counts' },
            { status: 500 }
        );
    }
}
