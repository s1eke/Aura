import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                username: true,
                avatar: true,
                myBubbleBackground: true,
                myBubbleBorder: true,
                myBubbleText: true,
                otherBubbleBackground: true,
                otherBubbleBorder: true,
                otherBubbleText: true,
                statusIcon: true,
                apiBaseUrl: true,
                apiKey: true,
                llmModel: true,
                visionModel: true,
                momentMode: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        return NextResponse.json({
            ...user,
            apiKey: user.apiKey ? '••••••••••••••••' : null,
        });
    } catch (error) {
        logger.error('Fetch profile error:', error);
        return NextResponse.json(
            { error: '获取资料失败' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const body = await request.json();
        const {
            username,
            avatar,
            myBubbleBackground,
            myBubbleBorder,
            myBubbleText,
            otherBubbleBackground,
            otherBubbleBorder,
            otherBubbleText,
            statusIcon,
            apiBaseUrl,
            apiKey,
            llmModel,
            visionModel,
            momentMode // Add momentMode
        } = body;

        // Prepare update data
        const updateData: Prisma.UserUpdateInput = {
            username: username || undefined,
            avatar: avatar || undefined,
            myBubbleBackground: myBubbleBackground || undefined,
            myBubbleBorder: myBubbleBorder || undefined,
            myBubbleText: myBubbleText || undefined,
            otherBubbleBackground: otherBubbleBackground || undefined,
            otherBubbleBorder: otherBubbleBorder || undefined,
            otherBubbleText: otherBubbleText || undefined,
            statusIcon: statusIcon, // Allow null to clear icon, or undefined to skip update if not provided
            momentMode: typeof momentMode === 'boolean' ? momentMode : undefined, // Ensure boolean
            apiBaseUrl: apiBaseUrl || undefined,
            llmModel: llmModel || undefined,
            visionModel: visionModel || undefined,
        };

        // Only update API key if it's not the placeholder (user actually changed it)
        const MASKED_PLACEHOLDER = '••••••••••••••••';
        logger.debug('[DEBUG] Received apiKey:', apiKey);
        logger.debug('[DEBUG] apiKey length:', apiKey?.length);
        logger.debug('[DEBUG] MASKED_PLACEHOLDER:', MASKED_PLACEHOLDER);
        logger.debug('[DEBUG] apiKey === MASKED_PLACEHOLDER:', apiKey === MASKED_PLACEHOLDER);
        logger.debug('[DEBUG] Will update apiKey?:', apiKey && apiKey !== MASKED_PLACEHOLDER);
        if (apiKey && apiKey !== MASKED_PLACEHOLDER) {
            updateData.apiKey = apiKey;
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: updateData,
        });

        // Return user data with masked API key for security
        const userResponse = {
            ...updatedUser,
            apiKey: updatedUser.apiKey ? MASKED_PLACEHOLDER : null,
        };

        return NextResponse.json({ user: userResponse });
    } catch (error) {
        logger.error('Update profile error:', error);
        return NextResponse.json(
            { error: '更新资料失败' },
            { status: 500 }
        );
    }
}
