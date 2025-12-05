import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/sessions/[id]/background -Save background with editing parameters
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

        const body = await request.json();
        const { imageUrl, bgMode } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: '未提供图片URL' }, { status: 400 });
        }

        // Update session with background
        const updated = await prisma.chatSession.update({
            where: { id: sessionId },
            data: {
                bgImage: imageUrl,
                bgMode: bgMode || 'cover',
            },
        });

        return NextResponse.json({
            bgImage: updated.bgImage,
            bgMode: updated.bgMode,
        });
    } catch (error) {
        logger.error('Background save error:', error);
        return NextResponse.json(
            { error: '保存背景失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/sessions/[id]/background - Remove background image
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: sessionId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        await prisma.chatSession.update({
            where: {
                id: sessionId,
                userId: session.user.id,
            },
            data: { bgImage: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Remove background error:', error);
        return NextResponse.json(
            { error: '移除背景失败' },
            { status: 500 }
        );
    }
}
