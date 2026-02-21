'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DBStats {
  projects: number;
  tokens: number;
  holders: number;
  events: number;
  recentEvents: Array<{
    id: string; type: string; severity: string;
    message: string; createdAt: string;
    project?: { name: string } | null;
  }>;
}

interface LiveData {
  trending: { id: string; name: string; symbol: string; market_cap_rank: number }[];
  topCoins: {
    id: string; name: string; symbol: string;
    current_price: number; price_change_percentage_24h: number;
    market_cap: number; image: string;
  }[];
}

const fmtPrice = (p: number) => p < 0.001 ? `$${p.toExponential(2)}` : `$${p.toFixed(p < 1 ? 4 : 2)}`;
const fmtCap = (c: number) => c >= 1e9 ? `$${(c / 1e9).toFixed(2)}B` : c >= 1e6 ? `$${(c / 1e6).toFixed(2)}M` : `$${c.toLocaleString()}`;

export default function Dashboard() {
  const [stats, setStats] = useState<DBStats | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch('/api/intelligence?type=trending')
      .then(r => r.json())
      .then(setLive)
      .catch(console.error)
      .finally(() => setLiveLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>ZOTA INTELLIGENCE</h2>
          <p>Multi-chain on-chain + off-chain AI analysis platform · 9 chains monitored</p>
        </div>
        <Link href="/report" className="btn btn-primary">
          🔬 Run Analysis
        </Link>
      </div>

      <div className="page-content">
        {/* Live market ticker */}
        {!liveLoading && live?.topCoins && live.topCoins.length > 0 && (
          <div style={{
            background: 'var(--bg-void)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            marginBottom: '20px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              gap: '32px',
              fontSize: '11px',
              fontFamily: 'Space Mono',
              whiteSpace: 'nowrap',
              animation: 'none',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}>
              <span style={{ color: 'var(--amber)', letterSpacing: '0.1em', flexShrink: 0 }}>LIVE ●</span>
              {live.topCoins.slice(0, 12).map(c => (
                <span key={c.id} style={{ flexShrink: 0 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{c.symbol.toUpperCase()} </span>
                  <span style={{ color: 'var(--text-primary)' }}>{fmtPrice(c.current_price)} </span>
                  <span style={{ color: c.price_change_percentage_24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {c.price_change_percentage_24h >= 0 ? '▲' : '▼'}{Math.abs(c.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* DB Stats */}
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          {[
            { href: '/projects', icon: '🚀', value: stats?.projects ?? '—', label: 'Projects Tracked', color: 'var(--amber)' },
            { href: '/tokens', icon: '🪙', value: stats?.tokens ?? '—', label: 'Tokens Indexed', color: 'var(--cyan)' },
            { href: '/holders', icon: '👥', value: stats?.holders ?? '—', label: 'Holders Profiled', color: 'var(--green)' },
            { href: '/events', icon: '📋', value: stats?.events ?? '—', label: 'Events Logged', color: 'var(--purple)' },
            { href: '/intelligence', icon: '🧠', value: '9', label: 'Chains Monitored', color: 'var(--amber)' },
            { href: '/report', icon: '🔬', value: 'AI', label: 'Manipulation Detector', color: 'var(--red)' },
          ].map(s => (
            <Link key={s.href} href={s.href} className="stat-card">
              <div className="stat-card-icon">{s.icon}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{loading ? '...' : s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </Link>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Trending */}
          <div className="card">
            <div className="card-header">
              <h3>🔥 Trending Now</h3>
              <Link href="/intelligence" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="card-body" style={{ padding: '12px' }}>
              {liveLoading ? (
                <div className="page-loading"><div className="loading-spinner"></div></div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {live?.trending?.slice(0, 10).map(c => (
                    <Link key={c.id} href={`/intelligence`} style={{
                      padding: '4px 10px',
                      background: 'var(--amber-dim)',
                      border: '1px solid rgba(245,166,35,0.2)',
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontFamily: 'Space Mono',
                      color: 'var(--amber)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>#{c.market_cap_rank}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{c.symbol.toUpperCase()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="card">
            <div className="card-header">
              <h3>📋 Recent Events</h3>
              <Link href="/events" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="card-body" style={{ padding: '12px' }}>
              {loading ? (
                <div className="page-loading"><div className="loading-spinner"></div></div>
              ) : !stats?.recentEvents?.length ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <div className="empty-state-icon">📋</div>
                  <p>No events yet</p>
                </div>
              ) : (
                stats.recentEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="event-row">
                    <div className={`event-dot ${event.severity}`}></div>
                    <div className="event-content">
                      <div className="event-message">{event.message}</div>
                      <div className="event-meta">
                        {event.type.replace(/_/g, ' ')} · {new Date(event.createdAt).toLocaleString()}
                        {event.project && ` · ${event.project.name}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top coins table */}
        <div className="card">
          <div className="card-header">
            <h3>📊 Top 10 by Market Cap — Live</h3>
            <Link href="/intelligence" className="btn btn-sm btn-secondary">Full Market →</Link>
          </div>
          {liveLoading ? (
            <div className="page-loading"><div className="loading-spinner"></div></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Token</th>
                    <th>Price</th>
                    <th>24h</th>
                    <th>Market Cap</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {live?.topCoins?.slice(0, 10).map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-dim)', fontFamily: 'Space Mono' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {c.image && <img src={c.image} alt={c.symbol} style={{ width: 18, height: 18, borderRadius: '50%' }} />}
                          <span style={{ fontFamily: 'Syne', fontWeight: 600 }}>{c.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'Space Mono' }}>{c.symbol.toUpperCase()}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'DM Mono' }}>{fmtPrice(c.current_price)}</td>
                      <td style={{ color: c.price_change_percentage_24h >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'DM Mono' }}>
                        {c.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(c.price_change_percentage_24h).toFixed(2)}%
                      </td>
                      <td style={{ fontFamily: 'DM Mono' }}>{fmtCap(c.market_cap)}</td>
                      <td>
                        <Link href="/report" className="btn btn-sm btn-secondary">🔬 Analyze</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick access */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { href: '/report', icon: '🔬', title: 'Manipulation Report', desc: 'Paste any contract → full AI forensic analysis' },
            { href: '/intelligence', icon: '🧠', title: 'Intelligence Hub', desc: 'Search tokens, DEX pairs, social signals' },
            { href: '/holders', icon: '👥', title: 'Holder Analysis', desc: 'AI risk scoring for wallet profiles' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="card" style={{ padding: '16px', display: 'block', cursor: 'pointer' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
