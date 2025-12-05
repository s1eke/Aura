import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/sessions - Get all chat sessions for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const sessions = await prisma.chatSession.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                persona: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        greeting: true,
                    }
                },
                messages: {
                    where: {
                        isDeleted: false,
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                    select: {
                        id: true,
                        content: true,
                        role: true,
                        createdAt: true,
                    }
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        logger.error('Get sessions error:', error);
        return NextResponse.json(
            { error: '获取会话列表失败' },
            { status: 500 }
        );
    }
}

// POST /api/sessions - Create a new chat session
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const { personaId } = body;

        if (!personaId) {
            return NextResponse.json(
                { error: '请选择一个人格' },
                { status: 400 }
            );
        }

        // Verify persona ownership
        const persona = await prisma.persona.findUnique({
            where: {
                id: personaId,
                userId: session.user.id,
            },
        });

        if (!persona) {
            return NextResponse.json(
                { error: '人格不存在' },
                { status: 404 }
            );
        }

        // Check if session already exists
        const existingSession = await prisma.chatSession.findFirst({
            where: {
                userId: session.user.id,
                personaId,
            },
            include: {
                persona: true,
            },
        });

        if (existingSession) {
            return NextResponse.json({ session: existingSession });
        }

        const chatSession = await prisma.chatSession.create({
            data: {
                userId: session.user.id,
                personaId,
            },
            include: {
                persona: true,
            },
        });

        return NextResponse.json({ session: chatSession }, { status: 201 });
    } catch (error) {
        logger.error('Create session error:', error);
        return NextResponse.json(
            { error: '创建会话失败' },
            { status: 500 }
        );
    }
}
