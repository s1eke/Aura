import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/moments - Get all moments for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;

        const moments = await prisma.moment.findMany({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        email: true,
                    },
                },
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ moments });
    } catch (error) {
        logger.error('Get moments error:', error);
        return NextResponse.json(
            { error: '获取动态列表失败' },
            { status: 500 }
        );
    }
}

// POST /api/moments - Create a new moment
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { content, imageIds } = body;

        // Validate content or images
        const hasContent = content && content.trim().length > 0;
        const hasImages = imageIds && Array.isArray(imageIds) && imageIds.length > 0;

        if (!hasContent && !hasImages) {
            return NextResponse.json(
                { error: '请输入内容或添加图片' },
                { status: 400 }
            );
        }

        // Create moment
        const moment = await prisma.moment.create({
            data: {
                content: content ? content.trim() : '',
                userId,
            },
        });

        // Add images if provided
        if (imageIds && Array.isArray(imageIds) && imageIds.length > 0) {
            await prisma.momentImage.createMany({
                data: imageIds.map((imageId: string, index: number) => ({
                    momentId: moment.id,
                    imageId,
                    order: index,
                })),
            });
        }

        // Fetch the complete moment with images
        const completeMoment = await prisma.moment.findUnique({
            where: { id: moment.id },
            include: {
                images: {
                    include: {
                        image: true,
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
                likes: true,
                comments: true,
            },
        });

        return NextResponse.json({ moment: completeMoment }, { status: 201 });
    } catch (error) {
        logger.error('Create moment error:', error);
        return NextResponse.json(
            { error: '创建动态失败' },
            { status: 500 }
        );
    }
}
