'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/Toast';

interface TokenDetail {
    id: string; name: string; symbol: string; chain: string; contractAddress: string;
    decimals: number; supply: number | null; price: number | null; marketCap: number | null;
    createdAt: string; updatedAt: string; project: { id: string; name: string; symbol: string; chain: string } | null;
}

export default function TokenDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [token, setToken] = useState<TokenDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', symbol: '', contractAddress: '', decimals: '9', supply: '', price: '', marketCap: '' });
    const [saving, setSaving] = useState(false);

    const loadToken = async () => {
        setLoading(true);
        const res = await fetch(`/api/tokens/${id}`);
        if (!res.ok) { router.push('/tokens'); return; }
        const data = await res.json();
        setToken(data);
        setForm({ name: data.name, symbol: data.symbol, contractAddress: data.contractAddress, decimals: data.decimals?.toString() || '9', supply: data.supply?.toString() || '', price: data.price?.toString() || '', marketCap: data.marketCap?.toString() || '' });
        setLoading(false);
    };

    useEffect(() => { loadToken(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const res = await fetch(`/api/tokens/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (res.ok) { showToast('success', 'Updated'); setEditing(false); loadToken(); } else showToast('error', 'Failed');
        setSaving(false);
    };

    if (loading) return <><div className="page-header"><div className="page-header-left"><h2>Loading...</h2></div></div><div className="page-content"><div className="page-loading"><div className="loading-spinner"></div></div></div></>;
    if (!token) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-header-left"><h2>{token.name} ({token.symbol})</h2><p>{token.chain}</p></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/tokens" className="btn btn-secondary">← Back</Link>
                    <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : '✏️ Edit'}</button>
                </div>
            </div>
            <div className="page-content">
                {editing ? (
                    <div className="card"><div className="card-header"><h3>Edit Token</h3></div><div className="card-body">
                        <form onSubmit={handleUpdate}>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Symbol</label><input className="form-input" required value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Contract</label><input className="form-input mono" value={form.contractAddress} onChange={e => setForm({ ...form, contractAddress: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" step="any" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Market Cap</label><input className="form-input" type="number" value={form.marketCap} onChange={e => setForm({ ...form, marketCap: e.target.value })} /></div>
                            </div>
                            <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
                        </form>
                    </div></div>
                ) : (
                    <div className="card"><div className="card-header"><h3>Details</h3></div><div className="card-body">
                        <div className="detail-field"><label>Contract Address</label><div className="value mono" style={{ wordBreak: 'break-all' }}>{token.contractAddress}</div></div>
                        <div className="form-row">
                            <div className="detail-field"><label>Decimals</label><div className="value">{token.decimals}</div></div>
                            <div className="detail-field"><label>Supply</label><div className="value">{token.supply?.toLocaleString() ?? '—'}</div></div>
                        </div>
                        <div className="form-row">
                            <div className="detail-field"><label>Price</label><div className="value">{token.price != null ? `$${token.price.toFixed(6)}` : '—'}</div></div>
                            <div className="detail-field"><label>Market Cap</label><div className="value">{token.marketCap != null ? `$${token.marketCap.toLocaleString()}` : '—'}</div></div>
                        </div>
                        {token.project && (
                            <div className="detail-field"><label>Project</label><div className="value"><Link href={`/projects/${token.project.id}`} style={{ color: 'var(--accent-cyan)' }}>{token.project.name} ({token.project.symbol})</Link></div></div>
                        )}
                    </div></div>
                )}
            </div>
        </>
    );
}
