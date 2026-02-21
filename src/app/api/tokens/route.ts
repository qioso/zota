import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const projectId = searchParams.get('projectId') || '';
        const chain = searchParams.get('chain') || '';

        const where: Record<string, unknown> = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { symbol: { contains: search } },
                { contractAddress: { contains: search } },
            ];
        }
        if (projectId) where.projectId = projectId;
        if (chain) where.chain = chain;

        const tokens = await prisma.token.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        // Fetch project info separately
        const projectIds = [...new Set(tokens.map(t => t.projectId))] as string[];
        const projects = projectIds.length > 0
            ? await prisma.project.findMany({
                where: { id: { in: projectIds } },
                select: { id: true, name: true, symbol: true, chain: true },
            })
            : [];
        const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

        const result = tokens.map(t => ({
            ...t,
            project: projectMap[t.projectId] ?? null,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Tokens GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const token = await prisma.token.create({
            data: {
                projectId: body.projectId,
                name: body.name,
                symbol: body.symbol,
                chain: body.chain || 'solana',
                contractAddress: body.contractAddress,
                decimals: body.decimals ? parseInt(body.decimals) : 9,
                supply: body.supply ? parseFloat(body.supply) : null,
                price: body.price ? parseFloat(body.price) : null,
                marketCap: body.marketCap ? parseFloat(body.marketCap) : null,
            },
        });

        await prisma.event.create({
            data: {
                projectId: body.projectId,
                type: 'token_created',
                severity: 'success',
                message: `Token "${token.name}" (${token.symbol}) on ${token.chain} was added`,
            },
        });

        return NextResponse.json(token, { status: 201 });
    } catch (error) {
        console.error('Tokens POST error:', error);
        return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }
}
