'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Holder {
    id: string; walletAddress: string; chain: string; balance: number; percentage: number | null;
    isWhale: boolean; riskScore: string | null; aiNotes: string | null;
    project?: { name: string; symbol: string; chain: string };
}
interface ProjectOption { id: string; name: string; symbol: string; chain: string }

const chainIcon: Record<string, string> = { solana: '◎', ethereum: 'Ξ', bnb: '⬡' };

export default function HoldersPage() {
    const [holders, setHolders] = useState<Holder[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [chainFilter, setChainFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [form, setForm] = useState({ projectId: '', walletAddress: '', chain: 'solana', balance: '', percentage: '' });
    const [saving, setSaving] = useState(false);

    const loadHolders = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (chainFilter) params.set('chain', chainFilter);
        try {
            const res = await fetch(`/api/wallet_holders?${params}`);
            if (res.ok) setHolders(await res.json());
        } catch { /* handled */ }
        setLoading(false);
    };

    useEffect(() => { loadHolders(); }, [search, chainFilter]);
    useEffect(() => { fetch('/api/projects_v2').then(r => r.json()).then(setProjects).catch(() => { }); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await fetch('/api/wallet_holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (res.ok) { showToast('success', 'Holder added'); setShowCreate(false); loadHolders(); }
            else showToast('error', 'Failed');
        } catch { showToast('error', 'Network error'); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await fetch(`/api/wallet_holders/${deleteId}`, { method: 'DELETE' });
        if (res.ok) { showToast('success', 'Deleted'); loadHolders(); } else showToast('error', 'Failed');
        setDeleteId(null);
    };

    const analyzeHolder = async (holderId: string) => {
        setAnalyzingId(holderId);
        try {
            const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'analyze_holder', entityId: holderId }) });
            if (res.ok) {
                const result = await res.json();
                showToast(result.riskLevel === 'high' || result.riskLevel === 'critical' ? 'error' : 'success', `AI: ${result.riskLevel} risk — ${result.flags.length} flags`);
                loadHolders();
            } else showToast('error', 'Analysis failed');
        } catch { showToast('error', 'Network error'); }
        setAnalyzingId(null);
    };

    const riskBadge = (risk: string | null) => {
        if (!risk) return '—';
        const cls = risk === 'high' || risk === 'critical' ? 'badge-error' : risk === 'medium' ? 'badge-warning' : 'badge-success';
        return <span className={`badge ${cls}`}>{risk}</span>;
    };

    return (
        <>
            <div className="page-header"><div className="page-header-left"><h2>Holders</h2><p>Multi-chain wallet tracking & AI analysis</p></div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Holder</button>
            </div>
            <div className="page-content">
                <div className="toolbar">
                    <div className="search-bar"><span className="search-icon">🔍</span><input type="text" placeholder="Search wallet address..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['', 'solana', 'ethereum', 'bnb'].map(c => <button key={c} className={`btn btn-sm ${chainFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChainFilter(c)}>{c ? `${chainIcon[c] || ''} ${c}` : 'All'}</button>)}
                    </div>
                </div>
                <div className="card">
                    {loading ? <div className="page-loading"><div className="loading-spinner"></div></div> : holders.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">👥</div><h3>No holders</h3><button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Holder</button></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Wallet</th><th>Chain</th><th>Project</th><th>Balance</th><th>%</th><th>Whale</th><th>Risk</th><th>Actions</th></tr></thead>
                            <tbody>{holders.map(h => <tr key={h.id}>
                                <td className="mono truncate" title={h.walletAddress}>{h.walletAddress}</td>
                                <td><span className="badge badge-default">{chainIcon[h.chain] || ''} {h.chain}</span></td>
                                <td>{h.project?.name || '—'}</td>
                                <td>{h.balance.toLocaleString()}</td>
                                <td>{h.percentage ? `${h.percentage.toFixed(2)}%` : '—'}</td>
                                <td>{h.isWhale ? '🐋' : ''}</td>
                                <td>{riskBadge(h.riskScore)}</td>
                                <td>
                                    <div className="table-actions">
                                        <button className="btn btn-sm btn-primary" onClick={() => analyzeHolder(h.id)} disabled={analyzingId === h.id} title="AI Analysis">
                                            {analyzingId === h.id ? '⏳' : '🤖'}
                                        </button>
                                        <Link href={`/holders/${h.id}`} className="btn btn-sm btn-secondary">View</Link>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(h.id)}>✕</button>
                                    </div>
                                </td>
                            </tr>)}</tbody></table></div>
                    )}
                </div>
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Add Holder</h3><button className="btn btn-icon" onClick={() => setShowCreate(false)}>✕</button></div>
                        <form onSubmit={handleCreate}><div className="modal-body">
                            <div className="form-group"><label className="form-label">Project *</label><select className="form-select" required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Select...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.chain})</option>)}</select></div>
                            <div className="form-group"><label className="form-label">Wallet Address *</label><input className="form-input mono" required value={form.walletAddress} onChange={e => setForm({ ...form, walletAddress: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Chain</label><select className="form-select" value={form.chain} onChange={e => setForm({ ...form, chain: e.target.value })}><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="bnb">BNB</option></select></div>
                                <div className="form-group"><label className="form-label">Balance *</label><input className="form-input" type="number" required step="any" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">% of Supply</label><input className="form-input" type="number" step="any" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} /></div>
                            </div>
                        </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Holder'}</button></div></form>
                    </div>
                </div>
            )}
            {deleteId && <ConfirmModal title="Remove Holder" message="Remove this holder?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </>
    );
}
