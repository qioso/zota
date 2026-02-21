import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const projectId = searchParams.get('projectId') || '';
        const chain = searchParams.get('chain') || '';

        let query = `SELECT * FROM "Holder" WHERE 1=1`;
        const params: any[] = [];

        if (search) {
            query += ` AND walletAddress LIKE ?`;
            params.push(`%${search}%`);
        }
        if (projectId) {
            query += ` AND projectId = ?`;
            params.push(projectId);
        }

        query += ` ORDER BY balance DESC`;

        const holders = await prisma.$queryRawUnsafe<any[]>(query, ...params);

        // Fetch project info separately
        const projectIds = [...new Set(holders.map(h => h.projectId))] as string[];

        let projects: any[] = [];
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            projects = await prisma.$queryRawUnsafe<any[]>(
                `SELECT id, name, symbol, chain, network FROM "Project" WHERE id IN (${placeholders})`,
                ...projectIds
            );
        }

        const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

        const result = holders.map(h => ({
            ...h,
            isWhale: Boolean(h.isWhale),
            project: projectMap[h.projectId] ? {
                ...projectMap[h.projectId],
                chain: projectMap[h.projectId].chain || projectMap[h.projectId].network || 'solana'
            } : null,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Holders GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch holders' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const id = randomUUID();
        const projectId = body.projectId;
        const walletAddress = body.walletAddress;
        const chain = body.chain || 'solana';
        const balance = parseFloat(body.balance);
        const percentage = body.percentage ? parseFloat(body.percentage) : null;
        const isWhale = body.isWhale ? 1 : 0;
        const riskScore = body.riskScore || null;
        const aiNotes = body.aiNotes || null;
        const createdAt = new Date().toISOString();
        const lastUpdated = createdAt;

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Holder" (id, projectId, walletAddress, chain, balance, percentage, isWhale, riskScore, aiNotes, createdAt, lastUpdated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id, projectId, walletAddress, chain, balance, percentage, isWhale, riskScore, aiNotes, createdAt, lastUpdated
        );

        const holder = { id, projectId, walletAddress, chain, balance, percentage, isWhale, riskScore, aiNotes, createdAt, lastUpdated };

        // Create log event
        const eventId = randomUUID();
        const type = 'holder_added';
        const severity = 'info';
        const message = `Holder ${walletAddress.substring(0, 8)}... added on ${chain}`;

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Event" (id, projectId, type, severity, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            eventId, projectId, type, severity, message, createdAt
        );

        return NextResponse.json({ ...holder, isWhale: Boolean(holder.isWhale) }, { status: 201 });
    } catch (error) {
        console.error('Holders POST error:', error);
        return NextResponse.json({ error: 'Failed to add holder' }, { status: 500 });
    }
}
