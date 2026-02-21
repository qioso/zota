'use client';

import { useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Event {
    id: string;
    type: string;
    severity: string;
    message: string;
    data: Record<string, unknown> | null;
    createdAt: string;
    project?: { name: string; symbol: string } | null;
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadEvents = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (severityFilter) params.set('severity', severityFilter);
        const res = await fetch(`/api/events_v2?${params}`);
        setEvents(await res.json());
        setLoading(false);
    };

    useEffect(() => { loadEvents(); }, [search, severityFilter]);

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await fetch(`/api/events_v2/${deleteId}`, { method: 'DELETE' });
        if (res.ok) { showToast('success', 'Event deleted'); loadEvents(); }
        else showToast('error', 'Failed to delete');
        setDeleteId(null);
    };

    const severityBadge = (severity: string) => {
        const map: Record<string, string> = { info: 'badge-info', success: 'badge-success', warning: 'badge-warning', error: 'badge-error' };
        return <span className={`badge ${map[severity] || 'badge-default'}`}>{severity}</span>;
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h2>Events</h2>
                    <p>System activity log</p>
                </div>
            </div>
            <div className="page-content">
                <div className="toolbar">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['', 'info', 'success', 'warning', 'error'].map((s) => (
                            <button
                                key={s}
                                className={`btn btn-sm ${severityFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setSeverityFilter(s)}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="card">
                    {loading ? (
                        <div className="page-loading"><div className="loading-spinner"></div></div>
                    ) : events.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <h3>No events</h3>
                            <p>Events are automatically logged when you manage projects, tokens, and holders.</p>
                        </div>
                    ) : (
                        <div className="card-body">
                            {events.map((ev) => (
                                <div key={ev.id} className="event-row" style={{ alignItems: 'center' }}>
                                    <div className={`event-dot ${ev.severity}`}></div>
                                    <div className="event-content" style={{ flex: 1 }}>
                                        <div className="event-message">{ev.message}</div>
                                        <div className="event-meta">
                                            {severityBadge(ev.severity)}
                                            {' • '}
                                            <span style={{ textTransform: 'capitalize' }}>{ev.type.replace(/_/g, ' ')}</span>
                                            {' • '}
                                            {new Date(ev.createdAt).toLocaleString()}
                                            {ev.project && ` • ${ev.project.name}`}
                                        </div>
                                    </div>
                                    <button className="btn btn-sm btn-icon btn-danger" onClick={() => setDeleteId(ev.id)} title="Delete event">✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {deleteId && <ConfirmModal title="Delete Event" message="Delete this event log entry?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </>
    );
}
