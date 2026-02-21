// CoinGecko price & token metadata fetcher (Demo API, free)

export interface CoinGeckoToken {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d_in_currency?: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
    ath: number;
    ath_change_percentage: number;
    image: string;
}

export interface CoinGeckoDetail {
    id: string;
    symbol: string;
    name: string;
    description: { en: string };
    links: {
        homepage: string[];
        twitter_screen_name: string;
        telegram_channel_identifier: string;
        repos_url: { github: string[] };
    };
    market_data: {
        current_price: { usd: number };
        market_cap: { usd: number };
        total_supply: number;
        circulating_supply: number;
        price_change_percentage_24h: number;
        price_change_percentage_7d: number;
        price_change_percentage_30d: number;
    };
    community_data: {
        twitter_followers: number;
        telegram_channel_user_count: number;
    };
    developer_data: {
        stars: number;
        forks: number;
        commit_count_4_weeks: number;
    };
}

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || '';

async function geckoFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    try {
        const url = new URL(`${COINGECKO_BASE}${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const res = await fetch(url.toString(), {
            headers: { 'x-cg-demo-api-key': API_KEY },
            next: { revalidate: 120 },
        });

        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Get top coins by market cap
export async function getTopCoins(limit = 100): Promise<CoinGeckoToken[]> {
    const result = await geckoFetch<CoinGeckoToken[]>('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit.toString(),
        page: '1',
        sparkline: 'false',
        price_change_percentage: '7d',
    });
    return result ?? [];
}

// Get detailed info for a specific coin
export async function getCoinDetail(coinId: string): Promise<CoinGeckoDetail | null> {
    return geckoFetch<CoinGeckoDetail>(`/coins/${coinId}`, {
        localization: 'false',
        tickers: 'false',
        market_data: 'true',
        community_data: 'true',
        developer_data: 'true',
    });
}

// Search for a coin by symbol or name
export async function searchCoin(query: string): Promise<{ id: string; symbol: string; name: string; market_cap_rank: number }[]> {
    const result = await geckoFetch<{ coins: { id: string; symbol: string; name: string; market_cap_rank: number }[] }>('/search', { query });
    return result?.coins?.slice(0, 5) ?? [];
}

// Get price for a specific contract address on a chain
export async function getTokenPriceByContract(chain: string, contractAddress: string): Promise<number | null> {
    // Map our chain names to CoinGecko platform IDs
    const platformMap: Record<string, string> = {
        ethereum: 'ethereum',
        bnb: 'binance-smart-chain',
        polygon: 'polygon-pos',
        arbitrum: 'arbitrum-one',
        base: 'base',
        optimism: 'optimistic-ethereum',
        avalanche: 'avalanche',
        fantom: 'fantom',
        solana: 'solana',
    };

    const platform = platformMap[chain];
    if (!platform) return null;

    const result = await geckoFetch<Record<string, { usd: number }>>(`/simple/token_price/${platform}`, {
        contract_addresses: contractAddress,
        vs_currencies: 'usd',
    });

    return result?.[contractAddress.toLowerCase()]?.usd ?? null;
}

// Get trending coins
export async function getTrendingCoins(): Promise<{ id: string; name: string; symbol: string; market_cap_rank: number }[]> {
    const result = await geckoFetch<{ coins: { item: { id: string; name: string; symbol: string; market_cap_rank: number } }[] }>('/search/trending');
    return result?.coins?.map(c => c.item) ?? [];
}
