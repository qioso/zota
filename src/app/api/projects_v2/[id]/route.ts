import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const [tokens, holders, events] = await Promise.all([
            prisma.token.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
            prisma.holder.findMany({ where: { projectId: id }, orderBy: { balance: 'desc' } }),
            prisma.event.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
        ]);

        return NextResponse.json({ ...project, tokens, holders, events });
    } catch (error) {
        console.error('Project GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const project = await prisma.project.update({
            where: { id },
            data: {
                name: body.name,
                symbol: body.symbol,
                chain: body.chain,
                mintAddress: body.mintAddress,
                network: body.network,
                description: body.description || null,
                website: body.website || null,
                imageUrl: body.imageUrl || null,
                totalSupply: body.totalSupply ? parseFloat(body.totalSupply) : null,
                status: body.status,
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error('Project PUT error:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.project.delete({ where: { id } });

        await prisma.event.create({
            data: {
                type: 'project_deleted',
                severity: 'warning',
                message: `Project "${project.name}" (${project.symbol}) was deleted`,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Project DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
