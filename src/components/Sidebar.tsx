'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Projects', href: '/projects', icon: '🚀' },
    { label: 'Tokens', href: '/tokens', icon: '🪙' },
    { label: 'Holders', href: '/holders', icon: '👥' },
    { label: 'Events', href: '/events', icon: '📋' },
    { label: 'Intelligence', href: '/intelligence', icon: '🧠' },
    { label: 'Report', href: '/report', icon: '🔬' },
];

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <aside className="sidebar" id="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">Z</div>
                <div>
                    <h1>Zota</h1>
                    <span>Solana Asset Parser</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                <div className="nav-section-label">Main</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="network-badge">
                    <div className="network-dot"></div>
                    <span>Solana Mainnet-Beta</span>
                </div>
            </div>
        </aside>
    );
}
