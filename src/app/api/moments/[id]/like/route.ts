import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/moments/[id]/like - Toggle like on a moment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: momentId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if moment exists
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
        });

        if (!moment) {
            return NextResponse.json({ error: '动态不存在' }, { status: 404 });
        }

        // Check if user has already liked this moment
        const existingLike = await prisma.momentLike.findUnique({
            where: {
                momentId_userId: {
                    momentId,
                    userId,
                },
            },
        });

        if (existingLike) {
            // Unlike - remove the like
            await prisma.momentLike.delete({
                where: { id: existingLike.id },
            });

            return NextResponse.json({ liked: false });
        } else {
            // Like - create a new like
            await prisma.momentLike.create({
                data: {
                    momentId,
                    userId,
                },
            });

            // Create notification if not self-like
            if (moment.userId !== userId) {
                await prisma.notification.create({
                    data: {
                        userId: moment.userId,
                        type: 'LIKE',
                        sourceUserId: userId,
                        momentId: momentId,
                    },
                });
            }

            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        logger.error('Toggle like error:', error);
        return NextResponse.json(
            { error: '点赞操作失败' },
            { status: 500 }
        );
    }
}
