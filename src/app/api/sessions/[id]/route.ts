import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/sessions/[id] - Get a specific chat session with messages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        const limit = parseInt(url.searchParams.get('limit') || '30');

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // 1. Verify session existence and access rights
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                persona: true,
                user: true,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        // 2. Fetch messages with pagination
        const messages = await prisma.message.findMany({
            where: {
                sessionId: id,
                isDeleted: false, // Only fetch non-deleted messages
            },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: {
                createdAt: 'desc', // Fetch latest first
            },
        });

        // 3. Reverse messages to return in chronological order (oldest to newest)
        const sortedMessages = messages.reverse();

        return NextResponse.json({
            session: {
                ...chatSession,
                messages: sortedMessages
            },
            hasMore: messages.length === limit,
            nextCursor: messages.length > 0 ? messages[0].id : null // The oldest message ID in this batch becomes the cursor for the next batch
        });
    } catch (error) {
        logger.error('Get session error:', error);
        return NextResponse.json(
            { error: '获取会话失败' },
            { status: 500 }
        );
    }
}

// PUT /api/sessions/[id] - Update session settings
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const {
            isPinned,
            isBlacklisted,
            bgImage,
            backgroundImage,
            allowEmoji,
            allowNudge,
            allowAction,
            allowActionDescription,
            maxReplies,
            contextSize,
            memoryEnabled
        } = body;

        // Prepare update data, only including defined fields
        const updateData: Prisma.ChatSessionUpdateInput = {};
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (isBlacklisted !== undefined) updateData.isBlacklisted = isBlacklisted;
        if (bgImage !== undefined) updateData.bgImage = bgImage;
        if (backgroundImage !== undefined) updateData.bgImage = backgroundImage;
        if (allowEmoji !== undefined) updateData.allowEmoji = allowEmoji;
        if (allowNudge !== undefined) updateData.allowNudge = allowNudge;
        if (allowAction !== undefined) updateData.allowAction = allowAction;
        if (allowActionDescription !== undefined) updateData.allowActionDescription = allowActionDescription;
        if (maxReplies !== undefined) updateData.maxReplies = maxReplies;
        if (contextSize !== undefined) {
            // Validate contextSize is between 10 and 20
            const size = Math.max(10, Math.min(20, contextSize));
            updateData.contextSize = size;
        }
        if (memoryEnabled !== undefined) updateData.memoryEnabled = memoryEnabled;

        const updatedSession = await prisma.chatSession.update({
            where: {
                id,
                userId: session.user.id,
            },
            data: updateData,
        });

        return NextResponse.json({ session: updatedSession });
    } catch (error) {
        logger.error('Update session error:', error);
        return NextResponse.json(
            { error: '更新会话失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/sessions/[id] - Delete a chat session
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
        const chatSession = await prisma.chatSession.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!chatSession) {
            return NextResponse.json({ error: '会话不存在' }, { status: 404 });
        }

        await prisma.chatSession.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete session error:', error);
        return NextResponse.json(
            { error: '删除会话失败' },
            { status: 500 }
        );
    }
}
