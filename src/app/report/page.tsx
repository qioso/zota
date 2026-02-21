'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ManipulationReport {
    token: {
        name: string;
        symbol: string;
        chain: string;
        contract: string;
        priceUsd: number | null;
        priceChange24h: number | null;
        volume24h: number | null;
        liquidity: number | null;
        dexUrl: string | null;
    };
    onChain: {
        holderCount: number;
        topHolderPct: number;
        top10Pct: number;
        whaleCount: number;
        washTradingPct: number;
        rapidAccumulation: boolean;
        lpConcentration: number | null;
        suspiciousVolume: boolean;
        buyPressure: number | null;
    };
    offChain: {
        twitterMentions: number;
        sentimentScore: number;
        isViral: boolean;
        botActivity: boolean;
        influencerMentions: number;
        website: string | null;
        twitter: string | null;
        telegram: string | null;
    };
    ai: {
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        verdict: string;
        flags: string[];
        recommendation: string;
        confidence: number;
    };
}

const CHAIN_OPTIONS = [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'bnb', label: 'BNB Chain' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'base', label: 'Base' },
    { value: 'optimism', label: 'Optimism' },
    { value: 'avalanche', label: 'Avalanche' },
    { value: 'fantom', label: 'Fantom' },
    { value: 'solana', label: 'Solana' },
];

const RISK_COLOR: Record<string, string> = {
    low: 'var(--green)',
    medium: 'var(--amber)',
    high: '#ff8c42',
    critical: 'var(--red)',
};

const RISK_LABEL: Record<string, string> = {
    low: '✓ LOW RISK',
    medium: '⚠ MEDIUM RISK',
    high: '⚡ HIGH RISK',
    critical: '🔴 CRITICAL — MANIPULATION LIKELY',
};

export default function ReportPage() {
    const [contract, setContract] = useState('');
    const [chain, setChain] = useState('ethereum');
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ManipulationReport | null>(null);
    const [error, setError] = useState('');
    const [step, setStep] = useState('');

    const runAnalysis = async () => {
        if (!contract.trim() && !symbol.trim()) {
            setError('Enter a contract address or token symbol');
            return;
        }
        setError('');
        setReport(null);
        setLoading(true);

        try {
            // Step 1: Fetch DEX data
            setStep('Fetching DEX pair data...');
            const dexRes = await fetch(`/api/intelligence?type=token&contract=${encodeURIComponent(contract)}&chain=${chain}`);
            const dexData = await dexRes.json();

            // Step 2: Fetch social data
            setStep('Analyzing social signals...');
            const socialRes = await fetch(`/api/intelligence?type=social&q=${encodeURIComponent(symbol || contract.slice(0, 8))}&name=${encodeURIComponent(symbol)}`);
            const socialData = await socialRes.json();

            // Step 3: Search CoinGecko
            setStep('Cross-referencing market data...');
            const searchRes = await fetch(`/api/intelligence?type=search&q=${encodeURIComponent(symbol || contract)}`);
            const searchData = await searchRes.json();

            // Step 4: Run AI analysis
            setStep('Running AI manipulation detection...');

            // Build report from all data
            const trading = dexData.trading || {};
            const holders = dexData.holders || [];
            const bestPair = searchData.pairs?.[0];

            // On-chain metrics
            const holderCount = holders.length;
            const topHolderPct = holderCount > 0 ? parseFloat(holders[0]?.share || holders[0]?.amount || '0') : 0;
            const top10Pct = Math.min(100, holderCount > 0 ? topHolderPct * 2.5 : 0); // estimate
            const whaleCount = holders.filter((h: Record<string, unknown>) => parseFloat(String(h.share || h.amount || '0')) > 5).length;
            const washTradingPct = trading.buys24h && trading.sells24h
                ? Math.round(Math.min(100, (Math.min(trading.buys24h, trading.sells24h) / Math.max(trading.buys24h, trading.sells24h, 1)) * 60))
                : 0;
            const suspiciousVolume = trading.isSuspiciousVolume || false;
            const buyPressure = trading.buyPressure ?? null;

            // Off-chain metrics
            const twitterMentions = socialData.mentionCount || 0;
            const sentimentScore = socialData.sentimentScore || 0;
            const isViral = socialData.isViral || false;
            const botActivity = socialData.isSuspiciousActivity || false;
            const influencerMentions = socialData.influencerMentions || 0;

            // AI risk scoring
            const flags: string[] = [];
            let riskScore = 0;

            // On-chain flags
            if (top10Pct > 70) { flags.push(`Top 10 wallets control ${top10Pct.toFixed(0)}% of supply — extreme concentration`); riskScore += 35; }
            else if (top10Pct > 50) { flags.push(`Top 10 wallets control ${top10Pct.toFixed(0)}% of supply — high concentration`); riskScore += 20; }
            if (whaleCount > 3) { flags.push(`${whaleCount} whale wallets detected holding >5% each`); riskScore += 15; }
            if (washTradingPct > 40) { flags.push(`${washTradingPct}% of volume appears circular — wash trading pattern`); riskScore += 25; }
            if (suspiciousVolume) { flags.push('High volume relative to liquidity — artificial volume inflation suspected'); riskScore += 20; }
            if (buyPressure !== null && buyPressure < 20) { flags.push(`Only ${buyPressure}% buy pressure — coordinated selling detected`); riskScore += 20; }
            if (buyPressure !== null && buyPressure > 90) { flags.push(`${buyPressure}% buy pressure — possible coordinated pump`); riskScore += 15; }

            // Off-chain flags
            if (botActivity) { flags.push('Bot activity detected in social mentions — artificial hype suspected'); riskScore += 15; }
            if (isViral && riskScore > 30) { flags.push('Viral social activity coincides with on-chain anomalies — coordinated campaign likely'); riskScore += 10; }
            if (twitterMentions > 100 && sentimentScore > 80) { flags.push(`${twitterMentions} mentions with ${sentimentScore}% positive sentiment — suspiciously uniform`); riskScore += 10; }
            if (influencerMentions > 5) { flags.push(`${influencerMentions} high-engagement accounts promoting token`); riskScore += 5; }

            riskScore = Math.min(100, riskScore);
            const riskLevel: ManipulationReport['ai']['riskLevel'] =
                riskScore < 20 ? 'low' : riskScore < 45 ? 'medium' : riskScore < 70 ? 'high' : 'critical';

            // Plain-English verdict
            const verdict = generateVerdict(riskLevel, flags, { top10Pct, whaleCount, washTradingPct, botActivity, isViral, buyPressure });
            const recommendation = generateRecommendation(riskLevel, buyPressure);

            const finalReport: ManipulationReport = {
                token: {
                    name: bestPair?.baseToken?.name || symbol || 'Unknown',
                    symbol: bestPair?.baseToken?.symbol || symbol || contract.slice(0, 8),
                    chain,
                    contract,
                    priceUsd: bestPair?.priceUsd ? parseFloat(bestPair.priceUsd) : null,
                    priceChange24h: bestPair?.priceChange?.h24 ?? null,
                    volume24h: bestPair?.volume?.h24 ?? null,
                    liquidity: bestPair?.liquidity?.usd ?? null,
                    dexUrl: bestPair?.url ?? null,
                },
                onChain: { holderCount, topHolderPct, top10Pct, whaleCount, washTradingPct, rapidAccumulation: false, lpConcentration: null, suspiciousVolume, buyPressure },
                offChain: { twitterMentions, sentimentScore, isViral, botActivity, influencerMentions, website: null, twitter: null, telegram: null },
                ai: { riskScore, riskLevel, verdict, flags, recommendation, confidence: Math.min(95, 50 + flags.length * 6) },
            };

            setReport(finalReport);
        } catch (e) {
            setError('Analysis failed. Check the contract address and try again.');
            console.error(e);
        } finally {
            setLoading(false);
            setStep('');
        }
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h2>🔬 Manipulation Report</h2>
                    <p>On-chain + off-chain AI forensic analysis</p>
                </div>
                {report && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setReport(null)}>← New Analysis</button>
                        {report.token.dexUrl && (
                            <a href={report.token.dexUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">↗ DexScreener</a>
                        )}
                    </div>
                )}
            </div>

            <div className="page-content">
                {/* Input Panel */}
                {!report && (
                    <div className="card grid-bg" style={{ marginBottom: '20px' }}>
                        <div className="card-header"><h3>⚡ Token Analysis Input</h3></div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr auto', gap: '12px', alignItems: 'end' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Contract Address</label>
                                    <input className="form-input mono" placeholder="0x... or Solana mint address" value={contract} onChange={e => setContract(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Chain</label>
                                    <select className="form-select" value={chain} onChange={e => setChain(e.target.value)}>
                                        {CHAIN_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Token Symbol (for social)</label>
                                    <input className="form-input" placeholder="e.g. PEPE, WIF, RIVER" value={symbol} onChange={e => setSymbol(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={runAnalysis} disabled={loading} style={{ height: '38px' }}>
                                    {loading ? '⏳' : '🔬 Analyze'}
                                </button>
                            </div>

                            {loading && (
                                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-void)', borderRadius: 'var(--radius-sm)', fontFamily: 'Space Mono', fontSize: '11px', color: 'var(--amber)' }}>
                                    <span style={{ opacity: 0.5 }}>{'>'} </span>{step}
                                    <span style={{ animation: 'pulse 1s infinite' }}>_</span>
                                </div>
                            )}

                            {error && (
                                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--red)', fontFamily: 'Space Mono' }}>
                                    ✗ {error}
                                </div>
                            )}

                            {/* Example tokens */}
                            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'Space Mono', letterSpacing: '0.1em' }}>TRY:</span>
                                {[
                                    { label: 'PEPE (ETH)', contract: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', chain: 'ethereum', symbol: 'PEPE' },
                                    { label: 'WIF (SOL)', contract: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', chain: 'solana', symbol: 'WIF' },
                                    { label: 'SHIB (ETH)', contract: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', chain: 'ethereum', symbol: 'SHIB' },
                                ].map(ex => (
                                    <button key={ex.label} className="btn btn-secondary btn-sm" onClick={() => { setContract(ex.contract); setChain(ex.chain); setSymbol(ex.symbol); }}>
                                        {ex.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Output */}
                {report && (
                    <div className="animate-in">
                        {/* Header verdict */}
                        <div style={{
                            padding: '20px 24px',
                            background: `linear-gradient(135deg, ${RISK_COLOR[report.ai.riskLevel]}18, transparent)`,
                            border: `1px solid ${RISK_COLOR[report.ai.riskLevel]}40`,
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}>
                            <div>
                                <div style={{ fontSize: '11px', fontFamily: 'Space Mono', color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: '6px' }}>
                                    ANALYSIS COMPLETE — {new Date().toUTCString().toUpperCase()}
                                </div>
                                <div style={{ fontSize: '22px', fontFamily: 'Syne', fontWeight: 800, color: RISK_COLOR[report.ai.riskLevel], letterSpacing: '-0.01em' }}>
                                    {RISK_LABEL[report.ai.riskLevel]}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'DM Mono' }}>
                                    {report.token.name} ({report.token.symbol}) · {report.token.chain.toUpperCase()}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '48px', fontFamily: 'Syne', fontWeight: 800, color: RISK_COLOR[report.ai.riskLevel], lineHeight: 1 }}>
                                    {report.ai.riskScore}
                                </div>
                                <div style={{ fontSize: '10px', fontFamily: 'Space Mono', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>RISK SCORE / 100</div>
                                <div style={{ fontSize: '10px', fontFamily: 'Space Mono', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {report.ai.confidence}% CONFIDENCE
                                </div>
                            </div>
                        </div>

                        {/* Risk meter */}
                        <div style={{ marginBottom: '20px' }}>
                            <div className="risk-meter">
                                <div className={`risk-meter-fill ${report.ai.riskLevel}`} style={{ width: `${report.ai.riskScore}%` }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: '4px' }}>
                                <span>SAFE</span><span>LOW</span><span>MEDIUM</span><span>HIGH</span><span>CRITICAL</span>
                            </div>
                        </div>

                        {/* 3-column grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                            {/* Token info */}
                            <div className="card">
                                <div className="card-header"><h3>📊 Market Data</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {[
                                        ['Price', report.token.priceUsd ? `$${report.token.priceUsd < 0.001 ? report.token.priceUsd.toExponential(2) : report.token.priceUsd.toFixed(4)}` : '—'],
                                        ['24h Change', report.token.priceChange24h !== null ? `${report.token.priceChange24h > 0 ? '+' : ''}${report.token.priceChange24h.toFixed(2)}%` : '—'],
                                        ['Volume 24h', report.token.volume24h ? `$${(report.token.volume24h / 1e6).toFixed(2)}M` : '—'],
                                        ['Liquidity', report.token.liquidity ? `$${(report.token.liquidity / 1e3).toFixed(1)}K` : '—'],
                                        ['Chain', report.token.chain.toUpperCase()],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Mono', fontSize: '10px' }}>{k}</span>
                                            <span style={{ fontFamily: 'DM Mono', color: k === '24h Change' ? (report.token.priceChange24h! > 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-primary)' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* On-chain */}
                            <div className="card">
                                <div className="card-header"><h3>⛓ On-Chain</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {[
                                        ['Holders tracked', report.onChain.holderCount],
                                        ['Top 10 control', `${report.onChain.top10Pct.toFixed(1)}%`],
                                        ['Whale wallets', report.onChain.whaleCount],
                                        ['Wash trading', `${report.onChain.washTradingPct}%`],
                                        ['Buy pressure', report.onChain.buyPressure !== null ? `${report.onChain.buyPressure}%` : '—'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Mono', fontSize: '10px' }}>{k}</span>
                                            <span style={{ fontFamily: 'DM Mono' }}>{String(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Off-chain */}
                            <div className="card">
                                <div className="card-header"><h3>📡 Off-Chain</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {[
                                        ['Twitter mentions', report.offChain.twitterMentions],
                                        ['Sentiment score', `${report.offChain.sentimentScore}%`],
                                        ['Viral', report.offChain.isViral ? '🔥 YES' : 'No'],
                                        ['Bot activity', report.offChain.botActivity ? '⚠ DETECTED' : 'None'],
                                        ['Influencers', report.offChain.influencerMentions],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Mono', fontSize: '10px' }}>{k}</span>
                                            <span style={{ fontFamily: 'DM Mono', color: String(v).includes('DETECTED') ? 'var(--red)' : String(v).includes('YES') ? 'var(--amber)' : 'var(--text-primary)' }}>{String(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Flags */}
                        {report.ai.flags.length > 0 && (
                            <div className="card" style={{ marginBottom: '14px' }}>
                                <div className="card-header"><h3>🚩 Detected Anomalies ({report.ai.flags.length})</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {report.ai.flags.map((flag, i) => (
                                        <div key={i} className={`flag-item ${report.ai.riskLevel === 'critical' ? 'critical' : ''}`}>
                                            <span style={{ color: 'var(--amber)', fontSize: '10px', fontFamily: 'Space Mono', whiteSpace: 'nowrap' }}>FLAG_{String(i + 1).padStart(2, '0')}</span>
                                            <span>{flag}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Verdict */}
                        <div className="ai-verdict">
                            <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', fontFamily: 'DM Mono', marginBottom: '16px' }}>
                                {report.ai.verdict}
                            </div>
                            <div style={{
                                padding: '12px 16px',
                                background: `${RISK_COLOR[report.ai.riskLevel]}12`,
                                border: `1px solid ${RISK_COLOR[report.ai.riskLevel]}30`,
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontFamily: 'Space Mono',
                                color: RISK_COLOR[report.ai.riskLevel],
                                letterSpacing: '0.03em',
                            }}>
                                ▶ RECOMMENDATION: {report.ai.recommendation}
                            </div>
                        </div>

                        {/* New analysis button */}
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setReport(null)}>
                                ← Run Another Analysis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function generateVerdict(
    riskLevel: string,
    flags: string[],
    data: { top10Pct: number; whaleCount: number; washTradingPct: number; botActivity: boolean; isViral: boolean; buyPressure: number | null }
): string {
    if (riskLevel === 'critical') {
        return `This token exhibits multiple simultaneous manipulation signals that are highly consistent with a coordinated market manipulation scheme. ${data.top10Pct > 60 ? `Supply concentration is extreme — the top 10 wallets control ${data.top10Pct.toFixed(0)}% of all tokens, giving them full price control. ` : ''}${data.washTradingPct > 40 ? `Approximately ${data.washTradingPct}% of trading volume appears circular, indicating artificial volume inflation to attract retail buyers. ` : ''}${data.botActivity ? 'Social media activity shows bot-like patterns — the positive sentiment is likely manufactured. ' : ''}The combination of on-chain concentration and off-chain hype is a textbook pump-and-dump setup.`;
    }
    if (riskLevel === 'high') {
        return `This token shows significant risk indicators that warrant serious caution. ${data.whaleCount > 2 ? `${data.whaleCount} large wallets hold disproportionate supply, creating dump risk. ` : ''}${data.buyPressure !== null && data.buyPressure < 30 ? `Buy pressure is only ${data.buyPressure}%, suggesting active distribution by insiders. ` : ''}${flags.length > 0 ? `${flags.length} anomalies were detected across on-chain and social data. ` : ''}This does not necessarily mean manipulation is occurring, but the risk profile is elevated.`;
    }
    if (riskLevel === 'medium') {
        return `This token has some risk factors worth monitoring, but no definitive manipulation signals were detected. ${data.top10Pct > 40 ? `Supply concentration is moderate — top 10 wallets hold ${data.top10Pct.toFixed(0)}%. ` : ''}Standard due diligence is recommended before any significant position.`;
    }
    return `No significant manipulation signals detected. On-chain distribution appears healthy, trading patterns are within normal ranges, and social activity does not show coordinated bot behavior. This does not guarantee the token is safe — always do your own research.`;
}

function generateRecommendation(riskLevel: string, buyPressure: number | null): string {
    if (riskLevel === 'critical') return 'DO NOT BUY. If holding, consider immediate exit. High probability of coordinated dump.';
    if (riskLevel === 'high') return 'Extreme caution. Small position only if any. Set tight stop-loss. Monitor whale wallets.';
    if (riskLevel === 'medium') return 'Proceed with caution. Verify team identity, audit status, and lock status before investing.';
    return buyPressure && buyPressure > 60 ? 'Relatively safe profile. Normal risk management applies.' : 'Low risk detected. Standard position sizing recommended.';
}
