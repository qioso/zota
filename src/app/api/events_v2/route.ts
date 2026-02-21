import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

interface EventRow {
    id: string;
    projectId: string | null;
    type: string;
    severity: string;
    message: string;
    createdAt: string | Date;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const severity = searchParams.get('severity') || '';
        const projectId = searchParams.get('projectId') || '';

        // Construct dynamic WHERE clause specifically tailored for this use case
        // Using raw SQL requires careful parameter handling.

        let query = `SELECT * FROM "Event" WHERE 1=1`;
        const params: any[] = [];

        if (type) { query += ` AND type = ?`; params.push(type); }
        if (severity) { query += ` AND severity = ?`; params.push(severity); }
        if (projectId) { query += ` AND projectId = ?`; params.push(projectId); }
        if (search) { query += ` AND message LIKE ?`; params.push(`%${search}%`); }

        query += ` ORDER BY createdAt DESC LIMIT 100`;

        console.log('Events Query:', query, params);

        const events = await prisma.$queryRawUnsafe<EventRow[]>(query, ...params);

        if (!Array.isArray(events)) {
            return NextResponse.json([]);
        }

        const projectIds = [...new Set(events.map(e => e.projectId).filter(Boolean))] as string[];

        let projects: any[] = [];
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            projects = await prisma.$queryRawUnsafe<any[]>(
                `SELECT id, name, symbol FROM "Project" WHERE id IN (${placeholders})`,
                ...projectIds
            );
        }

        const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p]));

        const result = events.map(e => ({
            ...e,
            project: e.projectId ? (projectMap[e.projectId] ?? null) : null,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Events GET error:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const id = randomUUID();
        const projectId = body.projectId || null;
        const type = body.type;
        const severity = body.severity || 'info';
        const message = body.message;
        const createdAt = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Event" (id, projectId, type, severity, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            id, projectId, type, severity, message, createdAt
        );

        const event = { id, projectId, type, severity, message, createdAt };

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Events POST error:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
