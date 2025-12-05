import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// DELETE /api/moments/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: momentId, commentId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userId = session.user.id;

        // Verify ownership of the comment
        const comment = await prisma.momentComment.findUnique({
            where: {
                id: commentId,
            },
        });

        if (!comment) {
            return NextResponse.json({ error: '评论不存在' }, { status: 404 });
        }

        if (comment.userId !== userId) {
            return NextResponse.json({ error: '无权删除此评论' }, { status: 403 });
        }

        if (comment.momentId !== momentId) {
            return NextResponse.json({ error: '评论不属于此动态' }, { status: 400 });
        }

        // Delete comment
        await prisma.momentComment.delete({
            where: { id: commentId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete comment error:', error);
        return NextResponse.json(
            { error: '删除评论失败' },
            { status: 500 }
        );
    }
}
