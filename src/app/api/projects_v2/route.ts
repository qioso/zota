import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const chain = searchParams.get('chain') || '';

        let query = `SELECT * FROM "Project" WHERE 1=1`;
        const params: any[] = [];

        if (status) { query += ` AND status = ?`; params.push(status); }
        if (chain) { query += ` AND chain = ?`; params.push(chain); }
        if (search) {
            query += ` AND (name LIKE ? OR symbol LIKE ? OR mintAddress LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += ` ORDER BY createdAt DESC`;

        const projects = await prisma.$queryRawUnsafe<any[]>(query, ...params);

        // Map safe fallbacks, skip counts to avoid crashing
        const result = projects.map(p => ({
            ...p,
            chain: p.chain || p.network || 'solana'
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Projects GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const id = randomUUID();
        const name = body.name;
        const symbol = body.symbol;
        const chain = body.chain || 'solana';
        const mintAddress = body.mintAddress;
        const network = body.network || 'mainnet';
        const description = body.description || null;
        const website = body.website || null;
        const imageUrl = body.imageUrl || null;
        const totalSupply = body.totalSupply ? parseFloat(body.totalSupply) : null;
        const status = body.status || 'active';
        const createdAt = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Project" (id, name, symbol, chain, mintAddress, network, description, website, imageUrl, totalSupply, status, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id, name, symbol, chain, mintAddress, network, description, website, imageUrl, totalSupply, status, createdAt
        );

        const project = { id, name, symbol, chain, mintAddress, network, description, website, imageUrl, totalSupply, status, createdAt };

        // Create log event
        const eventId = randomUUID();
        const type = 'project_created';
        const severity = 'success';
        const message = `Project "${project.name}" (${project.symbol}) on ${project.chain} was created`;
        const eventCreatedAt = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Event" (id, projectId, type, severity, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            eventId, project.id, type, severity, message, eventCreatedAt
        );

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error('Projects POST error:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
