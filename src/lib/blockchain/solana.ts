// Solana chain data fetcher using Solscan Pro API

export interface SolanaHolder {
    address: string;
    amount: number;
    decimals: number;
    owner: string;
    rank: number;
}

export interface SolanaTransaction {
    txHash: string;
    blockTime: number;
    status: string;
    lamport: number;
    fee: number;
    signer: string[];
}

export interface SolanaTokenMeta {
    symbol: string;
    name: string;
    decimals: number;
    supply: number;
    address: string;
    icon?: string;
    website?: string;
    twitter?: string;
    coingeckoId?: string;
}

const SOLSCAN_BASE = 'https://pro-api.solscan.io/v2.0';
const API_KEY = process.env.SOLSCAN_API_KEY || '';

async function solscanFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    try {
        const url = new URL(`${SOLSCAN_BASE}${endpoint}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        const res = await fetch(url.toString(), {
            headers: { 'token': API_KEY },
            next: { revalidate: 60 },
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.data ?? data ?? null;
    } catch {
        return null;
    }
}

// Get top holders for a Solana token
export async function getSolanaTokenHolders(mintAddress: string): Promise<SolanaHolder[]> {
    const result = await solscanFetch<{ items: SolanaHolder[] }>('/token/holders', {
        address: mintAddress,
        page: '1',
        page_size: '40',
    });
    return result?.items ?? [];
}

// Get token metadata
export async function getSolanaTokenMeta(mintAddress: string): Promise<SolanaTokenMeta | null> {
    return solscanFetch<SolanaTokenMeta>('/token/meta', { address: mintAddress });
}

// Get recent transactions for a Solana account
export async function getSolanaAccountTransactions(address: string): Promise<SolanaTransaction[]> {
    const result = await solscanFetch<SolanaTransaction[]>('/account/transactions', {
        address,
        page_size: '40',
    });
    return result ?? [];
}

// Get token transfer activity
export async function getSolanaTokenTransfers(mintAddress: string): Promise<unknown[]> {
    const result = await solscanFetch<unknown[]>('/token/transfer', {
        address: mintAddress,
        page: '1',
        page_size: '40',
        sort_by: 'block_time',
        sort_order: 'desc',
    });
    return result ?? [];
}

// Get account token holdings
export async function getSolanaAccountTokens(address: string): Promise<unknown[]> {
    const result = await solscanFetch<unknown[]>('/account/token-accounts', {
        address,
        type: 'token',
        page: '1',
        page_size: '20',
    });
    return result ?? [];
}
