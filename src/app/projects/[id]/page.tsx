'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface ProjectDetail {
    id: string; name: string; symbol: string; chain: string; mintAddress: string; network: string;
    description: string | null; website: string | null; totalSupply: number | null; status: string;
    createdAt: string; updatedAt: string;
    tokens: Array<{ id: string; name: string; symbol: string; contractAddress: string; price: number | null }>;
    holders: Array<{ id: string; walletAddress: string; balance: number; percentage: number | null; isWhale: boolean; riskScore: string | null }>;
    events: Array<{ id: string; type: string; severity: string; message: string; createdAt: string }>;
}

const chainIcon: Record<string, string> = { solana: '◎', ethereum: 'Ξ', bnb: '⬡' };

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
    const [form, setForm] = useState({ name: '', symbol: '', chain: 'solana', mintAddress: '', network: '', description: '', website: '', totalSupply: '', status: 'active' });
    const [saving, setSaving] = useState(false);

    const loadProject = async () => {
        setLoading(true);
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) { router.push('/projects'); return; }
        const data = await res.json();
        setProject(data);
        setForm({ name: data.name, symbol: data.symbol, chain: data.chain, mintAddress: data.mintAddress, network: data.network, description: data.description || '', website: data.website || '', totalSupply: data.totalSupply?.toString() || '', status: data.status });
        setLoading(false);
    };

    useEffect(() => { loadProject(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const res = await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (res.ok) { showToast('success', 'Updated'); setEditing(false); loadProject(); } else showToast('error', 'Failed');
        setSaving(false);
    };

    const handleDelete = async () => {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast('success', 'Deleted'); router.push('/projects'); } else showToast('error', 'Failed');
        setShowDelete(false);
    };

    const handleAiAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'analyze_project', entityId: id }) });
            if (res.ok) { const data = await res.json(); setAnalysisResult(data); showToast('success', 'AI analysis complete'); loadProject(); }
            else showToast('error', 'Analysis failed');
        } catch { showToast('error', 'Network error'); }
        setAnalyzing(false);
    };

    if (loading) return (<><div className="page-header"><div className="page-header-left"><h2>Loading...</h2></div></div><div className="page-content"><div className="page-loading"><div className="loading-spinner"></div></div></div></>);
    if (!project) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h2>{chainIcon[project.chain] || ''} {project.name} ({project.symbol})</h2>
                    <p>{project.chain} • {project.network} • <span className={`badge ${project.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{project.status}</span></p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/projects" className="btn btn-secondary">← Back</Link>
                    <button className="btn btn-primary" onClick={handleAiAnalysis} disabled={analyzing}>
                        {analyzing ? '🔄 Analyzing...' : '🤖 AI Analysis'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : '✏️ Edit'}</button>
                    <button className="btn btn-danger" onClick={() => setShowDelete(true)}>🗑 Delete</button>
                </div>
            </div>
            <div className="page-content">
                {analysisResult && (
                    <div className="card" style={{ marginBottom: '12px', borderLeft: '3px solid var(--accent-cyan)' }}>
                        <div className="card-header"><h3>🤖 AI Analysis Result</h3><button className="btn btn-sm btn-icon" onClick={() => setAnalysisResult(null)}>✕</button></div>
                        <div className="card-body">
                            <p><strong>Risk:</strong> <span className={`badge ${(analysisResult.riskLevel as string) === 'high' || (analysisResult.riskLevel as string) === 'critical' ? 'badge-error' : (analysisResult.riskLevel as string) === 'medium' ? 'badge-warning' : 'badge-success'}`}>{analysisResult.riskLevel as string} ({analysisResult.riskScore as number}/100)</span></p>
                            <p><strong>Holders:</strong> {analysisResult.totalHolders as number} total, {analysisResult.whaleCount as number} whales</p>
                            <p><strong>Concentration:</strong> {analysisResult.concentration as string}</p>
                            {(analysisResult.flags as string[])?.map((f: string, i: number) => <p key={i} style={{ opacity: 0.8 }}>{f}</p>)}
                            <p style={{ marginTop: '8px' }}><strong>{analysisResult.summary as string}</strong></p>
                        </div>
                    </div>
                )}

                {editing ? (
                    <div className="card">
                        <div className="card-header"><h3>Edit Project</h3></div>
                        <div className="card-body">
                            <form onSubmit={handleUpdate}>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Symbol</label><input className="form-input" required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Chain</label>
                                        <select className="form-select" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })}>
                                            <option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="bnb">BNB</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Network</label><input className="form-input" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Address</label><input className="form-input mono" value={form.mintAddress} onChange={(e) => setForm({ ...form, mintAddress: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="card">
                            <div className="card-header"><h3>Info</h3></div>
                            <div className="card-body">
                                <div className="detail-field"><label>Contract Address</label><div className="value mono" style={{ wordBreak: 'break-all' }}>{project.mintAddress}</div></div>
                                {project.description && <div className="detail-field"><label>Description</label><div className="value">{project.description}</div></div>}
                                <div className="form-row">
                                    {project.website && <div className="detail-field"><label>Website</label><div className="value"><a href={project.website} target="_blank" style={{ color: 'var(--accent-cyan)' }}>{project.website}</a></div></div>}
                                    {project.totalSupply && <div className="detail-field"><label>Total Supply</label><div className="value">{project.totalSupply.toLocaleString()}</div></div>}
                                </div>
                            </div>
                        </div>

                        {project.tokens.length > 0 && (
                            <div className="card" style={{ marginTop: '12px' }}>
                                <div className="card-header"><h3>Tokens ({project.tokens.length})</h3><Link href={`/tokens?projectId=${id}`} className="btn btn-sm btn-secondary">View All</Link></div>
                                <div className="card-body">
                                    <table className="data-table"><thead><tr><th>Name</th><th>Address</th><th>Price</th></tr></thead>
                                        <tbody>{project.tokens.map(t => <tr key={t.id}><td><strong>{t.name}</strong> ({t.symbol})</td><td className="mono truncate">{t.contractAddress}</td><td>{t.price ? `$${t.price.toFixed(6)}` : '—'}</td></tr>)}</tbody></table>
                                </div>
                            </div>
                        )}

                        {project.holders.length > 0 && (
                            <div className="card" style={{ marginTop: '12px' }}>
                                <div className="card-header"><h3>Holders ({project.holders.length})</h3><Link href={`/holders?projectId=${id}`} className="btn btn-sm btn-secondary">View All</Link></div>
                                <div className="card-body">
                                    <table className="data-table"><thead><tr><th>Wallet</th><th>Balance</th><th>%</th><th>Risk</th></tr></thead>
                                        <tbody>{project.holders.map(h => <tr key={h.id}>
                                            <td className="mono truncate">{h.isWhale && '🐋 '}{h.walletAddress}</td>
                                            <td>{h.balance.toLocaleString()}</td>
                                            <td>{h.percentage ? `${h.percentage.toFixed(2)}%` : '—'}</td>
                                            <td>{h.riskScore ? <span className={`badge ${h.riskScore === 'high' || h.riskScore === 'critical' ? 'badge-error' : h.riskScore === 'medium' ? 'badge-warning' : 'badge-success'}`}>{h.riskScore}</span> : '—'}</td>
                                        </tr>)}</tbody></table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            {showDelete && <ConfirmModal title="Delete Project" message={`Delete "${project.name}" and all related data?`} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}
        </>
    );
}
