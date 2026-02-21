import { NextRequest, NextResponse } from 'next/server';
import { getDexPairsByToken, searchDexPairs, getTradingActivity } from '@/lib/blockchain/dexscreener';
import { getTopCoins, getTrendingCoins, searchCoin } from '@/lib/blockchain/prices';
import { getTokenHolders, getTokenTransfers, EVM_CHAINS } from '@/lib/blockchain/evm';
import { getSolanaTokenHolders, getSolanaTokenMeta } from '@/lib/blockchain/solana';
import { analyzeSocialSentiment } from '@/lib/blockchain/social';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'trending';
        const query = searchParams.get('q') || '';
        const chain = searchParams.get('chain') || '';
        const contract = searchParams.get('contract') || '';

        switch (type) {
            case 'trending': {
                const [trending, topCoins] = await Promise.all([
                    getTrendingCoins(),
                    getTopCoins(20),
                ]);
                return NextResponse.json({ trending, topCoins });
            }

            case 'search': {
                if (!query) return NextResponse.json({ error: 'q required' }, { status: 400 });
                const [coins, pairs] = await Promise.all([
                    searchCoin(query),
                    searchDexPairs(query),
                ]);
                return NextResponse.json({ coins, pairs });
            }

            case 'token': {
                if (!contract) return NextResponse.json({ error: 'contract required' }, { status: 400 });

                if (chain === 'solana') {
                    const [meta, holders] = await Promise.all([
                        getSolanaTokenMeta(contract),
                        getSolanaTokenHolders(contract),
                    ]);
                    const pairs = await getDexPairsByToken(contract);
                    const trading = pairs[0] ? getTradingActivity(pairs[0]) : null;
                    return NextResponse.json({ meta, holders: holders.slice(0, 20), trading, dexUrl: pairs[0]?.url });
                } else {
                    const chainId = chain || 'ethereum';
                    const [holders, transfers, pairs] = await Promise.all([
                        getTokenHolders(chainId, contract),
                        getTokenTransfers(chainId, contract),
                        getDexPairsByToken(contract),
                    ]);
                    const trading = pairs[0] ? getTradingActivity(pairs[0]) : null;
                    return NextResponse.json({ holders: holders.slice(0, 20), transfers: transfers.slice(0, 10), trading, dexUrl: pairs[0]?.url });
                }
            }

            case 'social': {
                if (!query) return NextResponse.json({ error: 'q required (token symbol)' }, { status: 400 });
                const name = searchParams.get('name') || query;
                const sentiment = await analyzeSocialSentiment(query, name);
                return NextResponse.json(sentiment);
            }

            case 'chains': {
                return NextResponse.json({ chains: Object.entries(EVM_CHAINS).map(([id, c]) => ({ id, ...c })) });
            }

            default:
                return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
        }
    } catch (error) {
        console.error('Intelligence GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch intelligence data' }, { status: 500 });
    }
}
