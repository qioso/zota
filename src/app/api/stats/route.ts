import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [projects, tokens, holders, events] = await Promise.all([
            prisma.project.count(),
            prisma.token.count(),
            prisma.holder.count(),
            prisma.event.count(),
        ]);

        // Fetch recent events without include to avoid adapter issues
        const recentEventsRaw = await prisma.event.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
        });

        // Fetch project names separately
        const projectIds = [...new Set(recentEventsRaw.map(e => e.projectId).filter(Boolean))] as string[];
        const projectsData = projectIds.length > 0
            ? await prisma.project.findMany({
                where: { id: { in: projectIds } },
                select: { id: true, name: true },
            })
            : [];
        const projectMap = Object.fromEntries(projectsData.map(p => [p.id, p]));

        const recentEvents = recentEventsRaw.map(e => ({
            ...e,
            project: e.projectId ? (projectMap[e.projectId] ?? null) : null,
        }));

        return NextResponse.json({ projects, tokens, holders, events, recentEvents });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ projects: 0, tokens: 0, holders: 0, events: 0, recentEvents: [] });
    }
}
