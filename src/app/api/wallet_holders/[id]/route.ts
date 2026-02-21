import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Raw SQL for GET Holder
        const holders = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Holder" WHERE id = ? LIMIT 1`,
            id
        );
        const holder = holders[0] || null;

        if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Raw SQL for GET Project
        const projects = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Project" WHERE id = ? LIMIT 1`,
            holder.projectId
        );
        const project = projects[0] || null;

        // Ensure proper types/defaults
        const response = {
            ...holder,
            isWhale: Boolean(holder.isWhale), // SQLite integers 0/1 to boolean
            project: project ? {
                ...project,
                // Handle missing chain if older project
                chain: project.chain || project.network || 'solana'
            } : null
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Holder GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch holder' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Raw SQL for UPDATE
        const isWhale = body.isWhale ? 1 : 0;
        const riskScore = body.riskScore ?? null;
        const aiNotes = body.aiNotes ?? null;
        const percentage = body.percentage ? parseFloat(body.percentage) : null;
        const balance = parseFloat(body.balance);

        await prisma.$executeRawUnsafe(
            `UPDATE "Holder" SET 
                walletAddress = ?, 
                balance = ?, 
                percentage = ?, 
                isWhale = ?, 
                riskScore = ?, 
                aiNotes = ?, 
                lastUpdated = CURRENT_TIMESTAMP 
            WHERE id = ?`,
            body.walletAddress,
            balance,
            percentage,
            isWhale,
            riskScore,
            aiNotes,
            id
        );

        // Fetch back to return updated
        const holders = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Holder" WHERE id = ? LIMIT 1`,
            id
        );
        const holder = holders[0];

        return NextResponse.json({
            ...holder,
            isWhale: Boolean(holder.isWhale)
        });
    } catch (error) {
        console.error('Holder PUT error:', error);
        return NextResponse.json({ error: 'Failed to update holder' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get details first for event log
        const holders = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Holder" WHERE id = ? LIMIT 1`,
            id
        );
        const holder = holders[0];

        if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Delete holder
        await prisma.$executeRawUnsafe(`DELETE FROM "Holder" WHERE id = ?`, id);

        // Create log event
        const eventId = randomUUID();
        const type = 'holder_removed';
        const severity = 'info';
        const message = `Holder ${holder.walletAddress.substring(0, 8)}... was removed`;
        const createdAt = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Event" (id, projectId, type, severity, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            eventId, holder.projectId, type, severity, message, createdAt
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Holder DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete holder' }, { status: 500 });
    }
}
