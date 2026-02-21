'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Project {
    id: string;
    name: string;
    symbol: string;
    chain: string;
    mintAddress: string;
    status: string;
    createdAt: string;
    _count: { tokens: number; holders: number; events: number };
}

const CHAINS = ['', 'solana', 'ethereum', 'bnb', 'polygon', 'arbitrum', 'avalanche'];
const chainIcon: Record<string, string> = { solana: '◎', ethereum: 'Ξ', bnb: '⬡', polygon: '⬠', arbitrum: '🔵', avalanche: '🔺' };

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [chainFilter, setChainFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', symbol: '', chain: 'solana', mintAddress: '', network: 'mainnet', description: '', website: '', totalSupply: '' });
    const [saving, setSaving] = useState(false);

    const loadProjects = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (chainFilter) params.set('chain', chainFilter);
        const res = await fetch(`/api/projects?${params}`);
        if (res.ok) setProjects(await res.json());
        setLoading(false);
    };

    useEffect(() => { loadProjects(); }, [search, chainFilter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (res.ok) { showToast('success', 'Project created'); setShowCreate(false); setForm({ name: '', symbol: '', chain: 'solana', mintAddress: '', network: 'mainnet', description: '', website: '', totalSupply: '' }); loadProjects(); }
            else showToast('error', 'Failed to create project');
        } catch { showToast('error', 'Network error'); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await fetch(`/api/projects/${deleteId}`, { method: 'DELETE' });
        if (res.ok) { showToast('success', 'Project deleted'); loadProjects(); }
        else showToast('error', 'Failed to delete');
        setDeleteId(null);
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h2>Projects</h2>
                    <p>Manage multi-chain token projects</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
            </div>
            <div className="page-content">
                <div className="toolbar">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {CHAINS.map((c) => (
                            <button key={c} className={`btn btn-sm ${chainFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setChainFilter(c)}>
                                {c ? `${chainIcon[c] || ''} ${c}` : 'All'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="card">
                    {loading ? (
                        <div className="page-loading"><div className="loading-spinner"></div></div>
                    ) : projects.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🚀</div>
                            <h3>No projects yet</h3>
                            <p>Start by adding your first token project.</p>
                            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>Chain</th><th>Address</th><th>Status</th><th>Tokens</th><th>Holders</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {projects.map((p) => (
                                        <tr key={p.id}>
                                            <td><strong>{p.name}</strong> <span className="mono" style={{ opacity: 0.6 }}>{p.symbol}</span></td>
                                            <td><span className="badge badge-default">{chainIcon[p.chain] || ''} {p.chain}</span></td>
                                            <td className="mono truncate" title={p.mintAddress}>{p.mintAddress}</td>
                                            <td><span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                                            <td>{p._count?.tokens ?? 0}</td>
                                            <td>{p._count?.holders ?? 0}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <Link href={`/projects/${p.id}`} className="btn btn-sm btn-secondary">View</Link>
                                                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(p.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New Project</h3>
                            <button className="btn btn-icon" onClick={() => setShowCreate(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Project Name *</label><input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Symbol *</label><input className="form-input" required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="e.g. BONK" /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Chain *</label>
                                        <select className="form-select" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })}>
                                            <option value="solana">Solana</option>
                                            <option value="ethereum">Ethereum</option>
                                            <option value="bnb">BNB Chain</option>
                                            <option value="polygon">Polygon</option>
                                            <option value="arbitrum">Arbitrum</option>
                                            <option value="avalanche">Avalanche</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Network</label><input className="form-input" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Contract / Mint Address *</label><input className="form-input mono" required value={form.mintAddress} onChange={(e) => setForm({ ...form, mintAddress: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Total Supply</label><input className="form-input" type="number" value={form.totalSupply} onChange={(e) => setForm({ ...form, totalSupply: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && <ConfirmModal title="Delete Project" message="This will also delete all tokens and holders for this project." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </>
    );
}
