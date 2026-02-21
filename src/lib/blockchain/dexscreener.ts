// DexScreener API — free, no key needed
// Provides DEX trading data, liquidity, social links for tokens across all chains

export interface DexPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: { address: string; name: string; symbol: string };
    quoteToken: { address: string; name: string; symbol: string };
    priceNative: string;
    priceUsd?: string;
    txns: { m5: { buys: number; sells: number }; h1: { buys: number; sells: number }; h24: { buys: number; sells: number } };
    volume: { m5: number; h1: number; h6: number; h24: number };
    priceChange: { m5: number; h1: number; h6: number; h24: number };
    liquidity?: { usd: number; base: number; quote: number };
    fdv?: number;
    marketCap?: number;
    pairCreatedAt?: number;
    info?: {
        imageUrl?: string;
        websites?: { url: string }[];
        socials?: { type: string; url: string }[];
    };
}

const DEXSCREENER_BASE = 'https://api.dexscreener.com';

async function dexFetch<T>(endpoint: string): Promise<T | null> {
    try {
        const res = await fetch(`${DEXSCREENER_BASE}${endpoint}`, {
            next: { revalidate: 30 },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Search for a token by contract address
export async function getDexPairsByToken(contractAddress: string): Promise<DexPair[]> {
    const result = await dexFetch<{ pairs: DexPair[] }>(`/latest/dex/tokens/${contractAddress}`);
    return result?.pairs ?? [];
}

// Search by token name/symbol
export async function searchDexPairs(query: string): Promise<DexPair[]> {
    const result = await dexFetch<{ pairs: DexPair[] }>(`/latest/dex/search?q=${encodeURIComponent(query)}`);
    return result?.pairs?.slice(0, 10) ?? [];
}

// Get specific pair info
export async function getDexPair(chain: string, pairAddress: string): Promise<DexPair | null> {
    const result = await dexFetch<{ pairs: DexPair[] }>(`/latest/dex/pairs/${chain}/${pairAddress}`);
    return result?.pairs?.[0] ?? null;
}

// Get social links for a token from DexScreener
export function extractSocialLinks(pair: DexPair): { twitter?: string; telegram?: string; website?: string } {
    const socials: { twitter?: string; telegram?: string; website?: string } = {};
    if (pair.info?.websites?.[0]) socials.website = pair.info.websites[0].url;
    for (const s of pair.info?.socials ?? []) {
        if (s.type === 'twitter') socials.twitter = s.url;
        if (s.type === 'telegram') socials.telegram = s.url;
    }
    return socials;
}

// Get trading activity summary
export function getTradingActivity(pair: DexPair) {
    const h24 = pair.txns.h24;
    const total = h24.buys + h24.sells;
    const buyPressure = total > 0 ? (h24.buys / total) * 100 : 50;

    return {
        buys24h: h24.buys,
        sells24h: h24.sells,
        volume24h: pair.volume.h24,
        buyPressure: Math.round(buyPressure),
        priceChange24h: pair.priceChange.h24,
        liquidity: pair.liquidity?.usd ?? 0,
        isHighActivity: total > 500,
        isSuspiciousVolume: pair.volume.h24 > 1_000_000 && pair.liquidity?.usd && pair.liquidity.usd < 100_000,
    };
}
