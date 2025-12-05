import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

        // Verify session ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        // Soft delete all messages in the session
        await prisma.message.updateMany({
            where: {
                sessionId: id,
            },
            data: {
                isDeleted: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Clear history error:', error);
        return NextResponse.json(
            { error: '清空聊天记录失败' },
            { status: 500 }
        );
    }
}
