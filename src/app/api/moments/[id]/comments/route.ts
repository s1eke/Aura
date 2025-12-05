import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/moments/[id]/comments - Get all comments for a moment
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: momentId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const comments = await prisma.momentComment.findMany({
            where: { momentId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    },
                },
                persona: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json({ comments });
    } catch (error) {
        logger.error('Get comments error:', error);
        return NextResponse.json(
            { error: '获取评论失败' },
            { status: 500 }
        );
    }
}

// POST /api/moments/[id]/comments - Add a comment to a moment
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
        const body = await request.json();
        const { content } = body;

        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: '请输入评论内容' },
                { status: 400 }
            );
        }

        // Check if moment exists
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
        });

        if (!moment) {
            return NextResponse.json({ error: '动态不存在' }, { status: 404 });
        }

        // Create comment
        const comment = await prisma.momentComment.create({
            data: {
                momentId,
                userId,
                content: content.trim(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    },
                },
            },
        });

        // Create notification if not self-comment
        if (moment.userId !== userId) {
            await prisma.notification.create({
                data: {
                    userId: moment.userId,
                    type: 'COMMENT',
                    content: content.trim(),
                    sourceUserId: userId,
                    momentId: momentId,
                },
            });
        }

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        logger.error('Create comment error:', error);
        return NextResponse.json(
            { error: '添加评论失败' },
            { status: 500 }
        );
    }
}
