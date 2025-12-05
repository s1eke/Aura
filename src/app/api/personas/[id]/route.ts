import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/personas/[id] - Get a specific persona
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const persona = await prisma.persona.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!persona) {
            return NextResponse.json({ error: '人格不存在' }, { status: 404 });
        }

        return NextResponse.json({ persona });
    } catch (error) {
        logger.error('Get persona error:', error);
        return NextResponse.json(
            { error: '获取人格失败' },
            { status: 500 }
        );
    }
}

// PUT /api/personas/[id] - Update a persona
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
        const { name, avatar, instruction, gender, description, style, catchphrases, greeting } = body;

        // Verify ownership
        const existingPersona = await prisma.persona.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!existingPersona) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }

        const persona = await prisma.persona.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existingPersona.name,
                avatar: avatar !== undefined ? avatar : existingPersona.avatar,
                instruction: instruction !== undefined ? instruction : existingPersona.instruction,
                gender: gender !== undefined ? gender : existingPersona.gender,
                description: description !== undefined ? description : existingPersona.description,
                style: style !== undefined ? style : existingPersona.style,
                catchphrases: catchphrases !== undefined ? catchphrases : existingPersona.catchphrases,
                greeting: greeting !== undefined ? greeting : existingPersona.greeting,
            },
        });

        return NextResponse.json({ persona });
    } catch (error) {
        logger.error('Update persona error:', error);
        return NextResponse.json(
            { error: '更新人格失败' },
            { status: 500 }
        );
    }
}

// DELETE /api/personas/[id] - Delete a persona
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
        const persona = await prisma.persona.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!persona) {
            return NextResponse.json({ error: '人格不存在' }, { status: 404 });
        }

        await prisma.persona.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete persona error:', error);
        return NextResponse.json(
            { error: '删除人格失败' },
            { status: 500 }
        );
    }
}
