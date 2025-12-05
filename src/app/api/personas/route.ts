import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/personas - Get all personas for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const personas = await prisma.persona.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ personas });
    } catch (error) {
        logger.error('Get personas error:', error);
        return NextResponse.json(
            { error: '获取人格列表失败' },
            { status: 500 }
        );
    }
}

// POST /api/personas - Create a new persona
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const { name, avatar, instruction, gender, description, style, catchphrases, greeting } = body;

        if (!name) {
            return NextResponse.json(
                { error: '请输入角色名称' },
                { status: 400 }
            );
        }

        const userId = session.user.id;

        // Verify user exists (handling stale sessions after DB reset)
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });

        if (!userExists) {
            return NextResponse.json(
                { error: '用户不存在或会话已过期，请重新登录' },
                { status: 401 }
            );
        }


        logger.info('[Persona Create] Creating persona for user:', userId);
        const persona = await prisma.persona.create({
            data: {
                name,
                avatar: avatar || null,
                instruction: instruction || '',
                gender: gender || null,
                description: description || null,
                style: style || null,
                catchphrases: catchphrases || null,
                greeting: greeting || null,
                userId: userId,
            },
        });

        // Always create a session for the new persona so it appears in the chat list
        const chatSession = await prisma.chatSession.create({
            data: {
                userId: userId,
                personaId: persona.id,
            },
        });

        // If greeting is provided, send the greeting message
        if (greeting && greeting.trim()) {
            await prisma.message.create({
                data: {
                    content: greeting.trim(),
                    role: 'assistant',
                    sessionId: chatSession.id,
                    userId: userId,
                },
            });
        }

        return NextResponse.json({ persona, sessionId: chatSession.id }, { status: 201 });
    } catch (error) {
        logger.error('Create persona error:', error);
        return NextResponse.json(
            { error: '创建人格失败' },
            { status: 500 }
        );
    }
}
