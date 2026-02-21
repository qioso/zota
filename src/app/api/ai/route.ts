import { NextRequest, NextResponse } from 'next/server';
import { analyzeHolder, analyzeProject, discoverTrendingProjects } from '@/lib/ai/intelligence';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, entityId } = body;

        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 });
        }

        switch (action) {
            case 'analyze_holder': {
                if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 });
                const result = await analyzeHolder(entityId);
                return NextResponse.json(result);
            }

            case 'analyze_project': {
                if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 });
                const result = await analyzeProject(entityId);
                return NextResponse.json(result);
            }

            case 'discover_trending': {
                const result = await discoverTrendingProjects();
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        console.error('AI API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        actions: ['analyze_holder', 'analyze_project', 'discover_trending'],
        chains: ['ethereum', 'bnb', 'polygon', 'arbitrum', 'base', 'optimism', 'fantom', 'avalanche', 'solana'],
        dataSources: ['Etherscan (EVM)', 'Solscan (Solana)', 'CoinGecko (prices)', 'DexScreener (DEX)', 'Twitter/X (social)'],
    });
}
