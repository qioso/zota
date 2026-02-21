'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TrendingCoin {
    id: string; name: string; symbol: string; market_cap_rank: number;
}
interface TopCoin {
    id: string; name: string; symbol: string; current_price: number;
    price_change_percentage_24h: number; market_cap: number; total_volume: number; image: string;
}
interface DexPair {
    chainId: string; dexId: string; url: string;
    baseToken: { name: string; symbol: string; address: string };
    priceUsd?: string;
    volume: { h24: number };
    liquidity?: { usd: number };
    priceChange: { h24: number };
    txns: { h24: { buys: number; sells: number } };
}

const chainIcon: Record<string, string> = {
    ethereum: 'Ξ', bsc: '⬡', polygon: '⬟', arbitrum: '🔵',
    base: '🔷', optimism: '🔴', avalanche: '🔺', fantom: '👻', solana: '◎',
};

export default function IntelligencePage() {
    const [tab, setTab] = useState<'trending' | 'search' | 'token'>('trending');
    const [trending, setTrending] = useState<TrendingCoin[]>([]);
    const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ coins: { id: string; name: string; symbol: string; market_cap_rank: number }[]; pairs: DexPair[] } | null>(null);
    const [tokenContract, setTokenContract] = useState('');
    const [tokenChain, setTokenChain] = useState('ethereum');
    const [tokenData, setTokenData] = useState<{ holders: unknown[]; trading: unknown; dexUrl: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/intelligence?type=trending')
            .then(r => r.json())
            .then(d => { setTrending(d.trending ?? []); setTopCoins(d.topCoins ?? []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        const r = await fetch(`/api/intelligence?type=search&q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(await r.json());
        setLoading(false);
    };

    const handleTokenLookup = async () => {
        if (!tokenContract.trim()) return;
        setLoading(true);
        const r = await fetch(`/api/intelligence?type=token&contract=${tokenContract}&chain=${tokenChain}`);
        setTokenData(await r.json());
        setLoading(false);
    };

    const fmtPrice = (p: number) => p < 0.001 ? `$${p.toExponential(2)}` : `$${p.toFixed(p < 1 ? 4 : 2)}`;
    const fmtCap = (c: number) => c >= 1e9 ? `$${(c / 1e9).toFixed(2)}B` : c >= 1e6 ? `$${(c / 1e6).toFixed(2)}M` : `$${c.toLocaleString()}`;

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h2>🧠 Intelligence</h2>
                    <p>Real-time multi-chain analytics — prices, holders, social signals</p>
                </div>
            </div>
            <div className="page-content">
                {/* Tabs */}
                <div className="toolbar" style={{ marginBottom: '16px' }}>
                    {(['trending', 'search', 'token'] as const).map(t => (
                        <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
                            {t === 'trending' ? '🔥 Trending' : t === 'search' ? '🔍 Search' : '🔎 Token Lookup'}
                        </button>
                    ))}
                </div>

                {/* Trending Tab */}
                {tab === 'trending' && (
                    <>
                        {/* Trending from CoinGecko */}
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <div className="card-header"><h3>🔥 Trending on CoinGecko</h3></div>
                            <div className="card-body">
                                {loading ? <div className="page-loading"><div className="loading-spinner"></div></div> : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {trending.map(c => (
                                            <div key={c.id} className="badge badge-default" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                <strong>{c.symbol.toUpperCase()}</strong> <span style={{ opacity: 0.6 }}>#{c.market_cap_rank}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top 20 by Market Cap */}
                        <div className="card">
                            <div className="card-header"><h3>📊 Top 20 by Market Cap</h3></div>
                            {loading ? <div className="page-loading"><div className="loading-spinner"></div></div> : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>#</th><th>Token</th><th>Price</th><th>24h</th><th>Market Cap</th><th>Volume 24h</th></tr></thead>
                                        <tbody>
                                            {topCoins.map((c, i) => (
                                                <tr key={c.id}>
                                                    <td style={{ opacity: 0.5 }}>{i + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {c.image && <img src={c.image} alt={c.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                                                            <strong>{c.name}</strong> <span style={{ opacity: 0.5 }}>{c.symbol.toUpperCase()}</span>
                                                        </div>
                                                    </td>
                                                    <td>{fmtPrice(c.current_price)}</td>
                                                    <td style={{ color: c.price_change_percentage_24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                        {c.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(c.price_change_percentage_24h).toFixed(2)}%
                                                    </td>
                                                    <td>{fmtCap(c.market_cap)}</td>
                                                    <td>{fmtCap(c.total_volume)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Search Tab */}
                {tab === 'search' && (
                    <div className="card">
                        <div className="card-header"><h3>🔍 Search Token</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input className="form-input" placeholder="Search by name or symbol (e.g. PEPE, Uniswap)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1 }} />
                                <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>{loading ? '⏳' : 'Search'}</button>
                            </div>

                            {searchResults && (
                                <>
                                    {searchResults.coins?.length > 0 && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <h4 style={{ marginBottom: '8px', opacity: 0.7 }}>CoinGecko Results</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {searchResults.coins.map(c => (
                                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                                        <span><strong>{c.name}</strong> <span style={{ opacity: 0.5 }}>{c.symbol.toUpperCase()}</span></span>
                                                        <span style={{ opacity: 0.5 }}>Rank #{c.market_cap_rank || '—'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {searchResults.pairs?.length > 0 && (
                                        <div>
                                            <h4 style={{ marginBottom: '8px', opacity: 0.7 }}>DEX Pairs (DexScreener)</h4>
                                            <div className="table-wrapper">
                                                <table className="data-table">
                                                    <thead><tr><th>Token</th><th>Chain</th><th>DEX</th><th>Price</th><th>24h %</th><th>Volume</th><th>Liquidity</th><th>Link</th></tr></thead>
                                                    <tbody>
                                                        {searchResults.pairs.map((p, i) => (
                                                            <tr key={i}>
                                                                <td><strong>{p.baseToken.symbol}</strong></td>
                                                                <td><span className="badge badge-default">{chainIcon[p.chainId] || ''} {p.chainId}</span></td>
                                                                <td style={{ opacity: 0.6 }}>{p.dexId}</td>
                                                                <td>{p.priceUsd ? fmtPrice(parseFloat(p.priceUsd)) : '—'}</td>
                                                                <td style={{ color: (p.priceChange?.h24 ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                                    {(p.priceChange?.h24 ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(p.priceChange?.h24 ?? 0).toFixed(2)}%
                                                                </td>
                                                                <td>{fmtCap(p.volume?.h24 ?? 0)}</td>
                                                                <td>{p.liquidity?.usd ? fmtCap(p.liquidity.usd) : '—'}</td>
                                                                <td><a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">↗</a></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Token Lookup Tab */}
                {tab === 'token' && (
                    <div className="card">
                        <div className="card-header"><h3>🔎 Token Contract Lookup</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <select className="form-select" value={tokenChain} onChange={e => setTokenChain(e.target.value)} style={{ width: '140px' }}>
                                    <option value="ethereum">Ethereum</option>
                                    <option value="bnb">BNB Chain</option>
                                    <option value="polygon">Polygon</option>
                                    <option value="arbitrum">Arbitrum</option>
                                    <option value="base">Base</option>
                                    <option value="optimism">Optimism</option>
                                    <option value="avalanche">Avalanche</option>
                                    <option value="fantom">Fantom</option>
                                    <option value="solana">Solana</option>
                                </select>
                                <input className="form-input mono" placeholder="Contract / Mint address..." value={tokenContract} onChange={e => setTokenContract(e.target.value)} style={{ flex: 1, minWidth: '200px' }} />
                                <button className="btn btn-primary" onClick={handleTokenLookup} disabled={loading}>{loading ? '⏳ Loading...' : '🔍 Lookup'}</button>
                            </div>

                            {tokenData && (
                                <div>
                                    {tokenData.dexUrl && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <a href={tokenData.dexUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">↗ View on DexScreener</a>
                                        </div>
                                    )}
                                    {tokenData.trading && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                                            {Object.entries(tokenData.trading as Record<string, unknown>).map(([k, v]) => (
                                                <div key={k} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>{k}</div>
                                                    <div style={{ fontWeight: 600 }}>{typeof v === 'boolean' ? (v ? '✅' : '❌') : String(v)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {Array.isArray(tokenData.holders) && tokenData.holders.length > 0 && (
                                        <div>
                                            <h4 style={{ marginBottom: '8px', opacity: 0.7 }}>Top Holders</h4>
                                            <div className="table-wrapper">
                                                <table className="data-table">
                                                    <thead><tr><th>#</th><th>Address</th><th>Balance</th></tr></thead>
                                                    <tbody>
                                                        {(tokenData.holders as Record<string, unknown>[]).slice(0, 10).map((h, i) => (
                                                            <tr key={i}>
                                                                <td>{i + 1}</td>
                                                                <td className="mono" style={{ fontSize: '12px' }}>{String(h.address || h.owner || '').substring(0, 20)}...</td>
                                                                <td>{String(h.balance || h.amount || '—')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
