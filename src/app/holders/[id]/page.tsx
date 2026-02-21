'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';

interface HolderDetail {
    id: string; walletAddress: string; chain: string; balance: number;
    percentage: number | null; isWhale: boolean; riskScore: string | null; aiNotes: string | null;
    firstSeen: string; lastUpdated: string;
    project: { id: string; name: string; symbol: string; chain: string } | null;
}

export default function HolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [holder, setHolder] = useState<HolderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
    const [form, setForm] = useState({ walletAddress: '', balance: '', percentage: '' });
    const [saving, setSaving] = useState(false);

    const loadHolder = async () => {
        setLoading(true);
        const res = await fetch(`/api/wallet_holders/${id}`);
        if (!res.ok) { router.push('/holders'); return; }
        const data = await res.json();
        setHolder(data);
        setForm({ walletAddress: data.walletAddress, balance: data.balance?.toString() || '', percentage: data.percentage?.toString() || '' });
        setLoading(false);
    };

    useEffect(() => { loadHolder(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const res = await fetch(`/api/wallet_holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (res.ok) { showToast('success', 'Updated'); setEditing(false); loadHolder(); } else showToast('error', 'Failed');
        setSaving(false);
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'analyze_holder', entityId: id }) });
            if (res.ok) { const data = await res.json(); setAnalysisResult(data); showToast('success', 'Analysis complete'); loadHolder(); }
            else showToast('error', 'Failed');
        } catch { showToast('error', 'Network error'); }
        setAnalyzing(false);
    };

    if (loading) return <><div className="page-header"><div className="page-header-left"><h2>Loading...</h2></div></div><div className="page-content"><div className="page-loading"><div className="loading-spinner"></div></div></div></>;
    if (!holder) return null;

    const riskColor = holder.riskScore === 'high' || holder.riskScore === 'critical' ? 'badge-error' : holder.riskScore === 'medium' ? 'badge-warning' : 'badge-success';

    return (
        <>
            <div className="page-header">
                <div className="page-header-left"><h2>{holder.isWhale ? '🐋 ' : ''}Holder Details</h2><p className="mono">{holder.walletAddress}</p></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/holders" className="btn btn-secondary">← Back</Link>
                    <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? '⏳ Analyzing...' : '🤖 AI Analysis'}</button>
                    <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : '✏️ Edit'}</button>
                </div>
            </div>
            <div className="page-content">
                {analysisResult && (
                    <div className="card" style={{ marginBottom: '12px', borderLeft: '3px solid var(--accent-cyan)' }}>
                        <div className="card-header"><h3>🤖 AI Analysis</h3><button className="btn btn-sm btn-icon" onClick={() => setAnalysisResult(null)}>✕</button></div>
                        <div className="card-body">
                            <p><strong>Risk:</strong> <span className={`badge ${(analysisResult.riskLevel as string) === 'high' || (analysisResult.riskLevel as string) === 'critical' ? 'badge-error' : (analysisResult.riskLevel as string) === 'medium' ? 'badge-warning' : 'badge-success'}`}>{analysisResult.riskLevel as string}</span> — Confidence: {analysisResult.confidence as number}%</p>
                            <p><strong>Insider:</strong> {(analysisResult.isInsider as boolean) ? '🔴 Yes — potential insider detected' : '🟢 No insider indicators'}</p>
                            {(analysisResult.flags as string[])?.map((f: string, i: number) => <p key={i}>{f}</p>)}
                            <p style={{ marginTop: '8px', opacity: 0.8 }}><em>{analysisResult.recommendation as string}</em></p>
                        </div>
                    </div>
                )}

                {editing ? (
                    <div className="card"><div className="card-header"><h3>Edit Holder</h3></div><div className="card-body">
                        <form onSubmit={handleUpdate}>
                            <div className="form-group"><label className="form-label">Wallet</label><input className="form-input mono" value={form.walletAddress} onChange={e => setForm({ ...form, walletAddress: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Balance</label><input className="form-input" type="number" step="any" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">%</label><input className="form-input" type="number" step="any" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} /></div>
                            </div>
                            <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
                        </form>
                    </div></div>
                ) : (
                    <div className="card"><div className="card-header"><h3>Details</h3></div><div className="card-body">
                        <div className="detail-field"><label>Wallet Address</label><div className="value mono" style={{ wordBreak: 'break-all' }}>{holder.walletAddress}</div></div>
                        <div className="form-row">
                            <div className="detail-field"><label>Chain</label><div className="value">{holder.chain}</div></div>
                            <div className="detail-field"><label>Balance</label><div className="value">{holder.balance.toLocaleString()}</div></div>
                            <div className="detail-field"><label>% of Supply</label><div className="value">{holder.percentage ? `${holder.percentage.toFixed(2)}%` : '—'}</div></div>
                        </div>
                        <div className="form-row">
                            <div className="detail-field"><label>Whale</label><div className="value">{holder.isWhale ? '🐋 Yes' : 'No'}</div></div>
                            <div className="detail-field"><label>Risk Score</label><div className="value">{holder.riskScore ? <span className={`badge ${riskColor}`}>{holder.riskScore}</span> : '—'}</div></div>
                        </div>
                        {holder.aiNotes && <div className="detail-field"><label>AI Notes</label><div className="value" style={{ fontStyle: 'italic', opacity: 0.8 }}>{holder.aiNotes}</div></div>}
                        {holder.project && <div className="detail-field"><label>Project</label><div className="value"><Link href={`/projects/${holder.project.id}`} style={{ color: 'var(--accent-cyan)' }}>{holder.project.name} ({holder.project.symbol})</Link></div></div>}
                    </div></div>
                )}
            </div>
        </>
    );
}
