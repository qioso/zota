import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = await prisma.token.findUnique({ where: { id } });
        if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const project = await prisma.project.findUnique({ where: { id: token.projectId } });
        return NextResponse.json({ ...token, project });
    } catch (error) {
        console.error('Token GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const token = await prisma.token.update({
            where: { id },
            data: {
                name: body.name,
                symbol: body.symbol,
                contractAddress: body.contractAddress,
                decimals: body.decimals ? parseInt(body.decimals) : 9,
                supply: body.supply ? parseFloat(body.supply) : null,
                price: body.price ? parseFloat(body.price) : null,
                marketCap: body.marketCap ? parseFloat(body.marketCap) : null,
            },
        });

        return NextResponse.json(token);
    } catch (error) {
        console.error('Token PUT error:', error);
        return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = await prisma.token.findUnique({ where: { id } });
        if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.token.delete({ where: { id } });

        await prisma.event.create({
            data: {
                projectId: token.projectId,
                type: 'token_deleted',
                severity: 'warning',
                message: `Token "${token.name}" (${token.symbol}) was deleted`,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Token DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
    }
}
