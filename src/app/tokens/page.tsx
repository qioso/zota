'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Token {
    id: string; name: string; symbol: string; chain: string; contractAddress: string;
    decimals: number; supply: number | null; price: number | null; marketCap: number | null;
    createdAt: string; project?: { name: string; symbol: string; chain: string };
}
interface ProjectOption { id: string; name: string; symbol: string; chain: string }

const chainIcon: Record<string, string> = { solana: '◎', ethereum: 'Ξ', bnb: '⬡' };

export default function TokensPage() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [chainFilter, setChainFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [form, setForm] = useState({ projectId: '', name: '', symbol: '', chain: 'solana', contractAddress: '', decimals: '9', supply: '', price: '', marketCap: '' });
    const [saving, setSaving] = useState(false);

    const loadTokens = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (chainFilter) params.set('chain', chainFilter);
        try {
            const res = await fetch(`/api/tokens?${params}`);
            if (res.ok) setTokens(await res.json());
        } catch { /* handled */ }
        setLoading(false);
    };

    useEffect(() => { loadTokens(); }, [search, chainFilter]);
    useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => { }); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await fetch('/api/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (res.ok) { showToast('success', 'Token created'); setShowCreate(false); loadTokens(); }
            else showToast('error', 'Failed');
        } catch { showToast('error', 'Network error'); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await fetch(`/api/tokens/${deleteId}`, { method: 'DELETE' });
        if (res.ok) { showToast('success', 'Deleted'); loadTokens(); } else showToast('error', 'Failed');
        setDeleteId(null);
    };

    const fmtPrice = (p: number | null) => p == null ? '—' : p < 0.001 ? `$${p.toExponential(2)}` : `$${p.toFixed(4)}`;
    const fmtCap = (c: number | null) => { if (c == null) return '—'; if (c >= 1e9) return `$${(c / 1e9).toFixed(2)}B`; if (c >= 1e6) return `$${(c / 1e6).toFixed(2)}M`; return `$${c.toLocaleString()}`; };

    return (
        <>
            <div className="page-header"><div className="page-header-left"><h2>Tokens</h2><p>Multi-chain token assets</p></div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Token</button>
            </div>
            <div className="page-content">
                <div className="toolbar">
                    <div className="search-bar"><span className="search-icon">🔍</span><input type="text" placeholder="Search tokens..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['', 'solana', 'ethereum', 'bnb'].map(c => <button key={c} className={`btn btn-sm ${chainFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChainFilter(c)}>{c ? `${chainIcon[c] || ''} ${c}` : 'All'}</button>)}
                    </div>
                </div>
                <div className="card">
                    {loading ? <div className="page-loading"><div className="loading-spinner"></div></div> : tokens.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">🪙</div><h3>No tokens</h3><button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Token</button></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Token</th><th>Chain</th><th>Project</th><th>Price</th><th>Market Cap</th><th>Actions</th></tr></thead>
                            <tbody>{tokens.map(t => <tr key={t.id}>
                                <td><strong>{t.name}</strong> <span className="mono" style={{ opacity: 0.6 }}>{t.symbol}</span></td>
                                <td><span className="badge badge-default">{chainIcon[t.chain] || ''} {t.chain}</span></td>
                                <td>{t.project?.name || '—'}</td>
                                <td>{fmtPrice(t.price)}</td>
                                <td>{fmtCap(t.marketCap)}</td>
                                <td><div className="table-actions"><Link href={`/tokens/${t.id}`} className="btn btn-sm btn-secondary">View</Link><button className="btn btn-sm btn-danger" onClick={() => setDeleteId(t.id)}>Delete</button></div></td>
                            </tr>)}</tbody></table></div>
                    )}
                </div>
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>New Token</h3><button className="btn btn-icon" onClick={() => setShowCreate(false)}>✕</button></div>
                        <form onSubmit={handleCreate}><div className="modal-body">
                            <div className="form-group"><label className="form-label">Project *</label><select className="form-select" required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Select project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.symbol}) — {p.chain}</option>)}</select></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Symbol *</label><input className="form-input" required value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Chain</label><select className="form-select" value={form.chain} onChange={e => setForm({ ...form, chain: e.target.value })}><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="bnb">BNB</option></select></div>
                                <div className="form-group"><label className="form-label">Decimals</label><input className="form-input" type="number" value={form.decimals} onChange={e => setForm({ ...form, decimals: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Contract Address *</label><input className="form-input mono" required value={form.contractAddress} onChange={e => setForm({ ...form, contractAddress: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" step="any" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Market Cap</label><input className="form-input" type="number" value={form.marketCap} onChange={e => setForm({ ...form, marketCap: e.target.value })} /></div>
                            </div>
                        </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button></div></form>
                    </div>
                </div>
            )}
            {deleteId && <ConfirmModal title="Delete Token" message="Are you sure?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </>
    );
}
