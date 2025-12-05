import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSessionMemories, createSessionMemory } from '@/lib/memory';
import { createOpenAIClient } from '@/lib/openai';
import { logger } from '@/lib/logger';

// GET /api/sessions/[id]/memories - Get all memories for a session
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Verify session ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        const memories = await getSessionMemories(sessionId, 1);

        return NextResponse.json({ memories });
    } catch (error) {
        logger.error('Get memories error:', error);
        return NextResponse.json(
            { error: '获取记忆失败' },
            { status: 500 }
        );
    }
}

// POST /api/sessions/[id]/memories - Manually trigger summarization
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // Verify session ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }



        // Fetch user's API settings directly from database (session has masked values)
        const userId = session.user.id;
        const userSettings = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                apiKey: true,
                apiBaseUrl: true,
                llmModel: true,
            }
        });

        if (!userSettings || !userSettings.apiKey) {
            return NextResponse.json(
                { error: '请先在"我-偏好设置-API设置"中配置API Key' },
                { status: 400 }
            );
        }

        const openai = createOpenAIClient(userSettings.apiKey, userSettings.apiBaseUrl || undefined);

        const memory = await createSessionMemory(openai, sessionId, userSettings.llmModel || undefined);

        return NextResponse.json({ memory });
    } catch (error) {
        logger.error('Create memory error:', error);
        return NextResponse.json(
            { error: '创建记忆失败' },
            { status: 500 }
        );
    }
}
