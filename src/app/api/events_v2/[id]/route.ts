import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Raw SQL for GET
        const events = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Event" WHERE id = ? LIMIT 1`,
            id
        );
        const event = events[0] || null;

        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        let project = null;
        if (event.projectId) {
            const projects = await prisma.$queryRawUnsafe<any[]>(
                `SELECT name, symbol FROM "Project" WHERE id = ? LIMIT 1`,
                event.projectId
            );
            project = projects[0] || null;
        }

        return NextResponse.json({ ...event, project });
    } catch (error) {
        console.error('Event GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Raw SQL for DELETE
        await prisma.$executeRawUnsafe(`DELETE FROM "Event" WHERE id = ?`, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Event DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
