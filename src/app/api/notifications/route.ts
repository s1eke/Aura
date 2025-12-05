import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        logger.debug('[Notifications API] Fetching notifications for user:', userId);

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
            },
            include: {
                sourceUser: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    }
                },
                sourcePersona: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    }
                },
                moment: {
                    select: {
                        id: true,
                        content: true,
                        images: {
                            take: 1,
                            include: {
                                image: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: skip,
        });

        const total = await prisma.notification.count({
            where: {
                userId,
            },
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        logger.debug('[Notifications API] Found', notifications.length, 'notifications, unread:', unreadCount);

        return NextResponse.json({
            notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        });
    } catch (error) {
        logger.error('Get notifications error:', error);
        return NextResponse.json(
            { error: '获取通知失败' },
            { status: 500 }
        );
    }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { notificationIds, markAll } = body;

        if (markAll) {
            await prisma.notification.updateMany({
                where: {
                    userId,
                    isRead: false,
                },
                data: {
                    isRead: true,
                },
            });
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await prisma.notification.updateMany({
                where: {
                    userId,
                    id: {
                        in: notificationIds,
                    },
                },
                data: {
                    isRead: true,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Update notifications error:', error);
        return NextResponse.json(
            { error: '更新通知状态失败' },
            { status: 500 }
        );
    }
}
