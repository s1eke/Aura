import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// PUT /api/sessions/[id]/memories/[memoryId] - Update memory content
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId, memoryId } = await params;

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

        const body = await request.json();
        const { content } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: '记忆内容不能为空' }, { status: 400 });
        }

        const memory = await prisma.sessionMemory.update({
            where: {
                id: memoryId,
                sessionId, // Ensure memory belongs to this session
            },
            data: {
                content: content.trim(),
                createdAt: new Date(), // Reset timestamp to restart message counting
            },
        });

        return NextResponse.json({ memory });
    } catch (error) {
        logger.error('Update memory error:', error);
        return NextResponse.json(
            { error: '更新记忆失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/sessions/[id]/memories/[memoryId] - Delete a memory
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId, memoryId } = await params;

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

        await prisma.sessionMemory.delete({
            where: {
                id: memoryId,
                sessionId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete memory error:', error);
        return NextResponse.json(
            { error: '删除记忆失败' },
            { status: 500 }
        );
    }
}
