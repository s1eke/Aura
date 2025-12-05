import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/moments/[id] - Get a specific moment
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const moment = await prisma.moment.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                images: {
                    include: {
                        image: true,
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
                likes: {
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
                },
                comments: {
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
                },
            },
        });

        if (!moment) {
            return NextResponse.json({ error: '动态不存在' }, { status: 404 });
        }

        return NextResponse.json({ moment });
    } catch (error) {
        logger.error('Get moment error:', error);
        return NextResponse.json(
            { error: '获取动态失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/moments/[id] - Delete a moment
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Verify ownership
        const moment = await prisma.moment.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!moment) {
            return NextResponse.json({ error: '动态不存在' }, { status: 404 });
        }

        // Delete moment (cascade will handle images, likes, comments due to schema)
        await prisma.moment.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete moment error:', error);
        return NextResponse.json(
            { error: '删除动态失败' },
            { status: 500 }
        );
    }
}
