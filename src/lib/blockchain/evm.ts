// EVM Chain fetcher — covers ETH, BNB, Polygon, Arbitrum, Base, Optimism, Fantom, Avalanche
// Uses one Etherscan API key across all chains

export interface EVMTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    timeStamp: string;
    tokenName?: string;
    tokenSymbol?: string;
    tokenDecimal?: string;
    contractAddress?: string;
    gasUsed: string;
    isError: string;
}

export interface EVMHolder {
    address: string;
    balance: string;
    share?: number;
}

export const EVM_CHAINS: Record<string, { name: string; apiUrl: string; nativeSymbol: string }> = {
    ethereum: { name: 'Ethereum', apiUrl: 'https://api.etherscan.io/api', nativeSymbol: 'ETH' },
    bnb: { name: 'BNB Chain', apiUrl: 'https://api.bscscan.com/api', nativeSymbol: 'BNB' },
    polygon: { name: 'Polygon', apiUrl: 'https://api.polygonscan.com/api', nativeSymbol: 'MATIC' },
    arbitrum: { name: 'Arbitrum', apiUrl: 'https://api.arbiscan.io/api', nativeSymbol: 'ETH' },
    base: { name: 'Base', apiUrl: 'https://api.basescan.org/api', nativeSymbol: 'ETH' },
    optimism: { name: 'Optimism', apiUrl: 'https://api-optimistic.etherscan.io/api', nativeSymbol: 'ETH' },
    fantom: { name: 'Fantom', apiUrl: 'https://api.ftmscan.com/api', nativeSymbol: 'FTM' },
    avalanche: { name: 'Avalanche', apiUrl: 'https://api.snowtrace.io/api', nativeSymbol: 'AVAX' },
};

const API_KEY = process.env.ETHERSCAN_API_KEY || '';

async function evmFetch(chain: string, params: Record<string, string>) {
    const chainConfig = EVM_CHAINS[chain];
    if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

    const url = new URL(chainConfig.apiUrl);
    Object.entries({ ...params, apikey: API_KEY }).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`EVM API error: ${res.status}`);
    const data = await res.json();
    if (data.status === '0' && data.message !== 'No transactions found') {
        throw new Error(`EVM API: ${data.message} — ${data.result}`);
    }
    return data.result;
}

// Get token holders for an ERC-20 contract
export async function getTokenHolders(chain: string, contractAddress: string): Promise<EVMHolder[]> {
    try {
        const result = await evmFetch(chain, {
            module: 'token',
            action: 'tokenholderlist',
            contractaddress: contractAddress,
            page: '1',
            offset: '100',
        });
        return Array.isArray(result) ? result : [];
    } catch {
        return [];
    }
}

// Get token transfer events for a contract
export async function getTokenTransfers(chain: string, contractAddress: string, address?: string): Promise<EVMTransaction[]> {
    try {
        const params: Record<string, string> = {
            module: 'account',
            action: 'tokentx',
            contractaddress: contractAddress,
            page: '1',
            offset: '50',
            sort: 'desc',
        };
        if (address) params.address = address;

        const result = await evmFetch(chain, params);
        return Array.isArray(result) ? result : [];
    } catch {
        return [];
    }
}

// Get native ETH/BNB/etc transactions for a wallet
export async function getWalletTransactions(chain: string, address: string): Promise<EVMTransaction[]> {
    try {
        const result = await evmFetch(chain, {
            module: 'account',
            action: 'txlist',
            address,
            page: '1',
            offset: '50',
            sort: 'desc',
        });
        return Array.isArray(result) ? result : [];
    } catch {
        return [];
    }
}

// Get token balance for a wallet
export async function getTokenBalance(chain: string, contractAddress: string, walletAddress: string): Promise<string> {
    try {
        return await evmFetch(chain, {
            module: 'account',
            action: 'tokenbalance',
            contractaddress: contractAddress,
            address: walletAddress,
            tag: 'latest',
        });
    } catch {
        return '0';
    }
}

// Get contract info (verify if it's a token)
export async function getContractABI(chain: string, contractAddress: string): Promise<string> {
    try {
        return await evmFetch(chain, {
            module: 'contract',
            action: 'getabi',
            address: contractAddress,
        });
    } catch {
        return '';
    }
}

// Get ETH/token supply
export async function getTokenSupply(chain: string, contractAddress: string): Promise<string> {
    try {
        return await evmFetch(chain, {
            module: 'stats',
            action: 'tokensupply',
            contractaddress: contractAddress,
        });
    } catch {
        return '0';
    }
}
