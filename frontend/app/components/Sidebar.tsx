'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'doctor' | 'nurse' | 'patient';
    patient_id?: string;
}

interface NavItem {
    name: string;
    path: string;
    roles: string[];
    icon: React.ReactNode;
    color: string; // dot/indicator color
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const ICON = 'w-4 h-4';

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            {
                name: 'Admin',
                path: '/admin',
                roles: ['owner'],
                color: '#8B5CF6',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
            },
            {
                name: 'AI Chat',
                path: '/',
                roles: ['owner', 'doctor', 'patient'],
                color: '#0D9488',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Patient Care',
        items: [
            {
                name: 'Health Records',
                path: '/ehr',
                roles: ['owner', 'doctor'],
                color: '#2563EB',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            },
            {
                name: 'Appointments',
                path: '/appointments',
                roles: ['owner', 'doctor', 'patient'],
                color: '#059669',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Clinical Tools',
        items: [
            {
                name: 'Scan Analysis',
                path: '/scan-analysis',
                roles: ['owner', 'doctor'],
                color: '#0891B2',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                ),
            },
            {
                name: 'Report Builder',
                path: '/report-builder',
                roles: ['owner', 'doctor'],
                color: '#D97706',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                ),
            },
            {
                name: 'Medication Guide',
                path: '/medication-guide',
                roles: ['owner', 'doctor'],
                color: '#DB2777',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Nursing',
        items: [
            {
                name: 'Nurse Station',
                path: '/nurse',
                roles: ['owner', 'nurse'],
                color: '#EC4899',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Compliance',
        items: [
            {
                name: 'HIPAA Audit',
                path: '/compliance',
                roles: ['owner'],
                color: '#64748B',
                icon: (
                    <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
            },
        ],
    },
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    owner:   { label: 'Administrator', color: '#7C3AED', bg: '#EDE9FE' },
    doctor:  { label: 'Clinician',     color: '#0D9488', bg: '#F0FDFA' },
    nurse:   { label: 'Nurse',         color: '#DB2777', bg: '#FDF2F8' },
    patient: { label: 'Patient',       color: '#059669', bg: '#F0FDF4' },
};

export default function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isLoginPage = pathname === '/login';

    useEffect(() => {
        if (isLoginPage) { setLoading(false); return; }
        fetch('/api/auth/me')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.user) setUser(d.user); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isLoginPage]);

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    if (isLoginPage) return null;

    const visibleGroups = NAV_GROUPS.map(group => ({
        ...group,
        items: user ? group.items.filter(i => i.roles.includes(user.role)) : [],
    })).filter(g => g.items.length > 0);

    const roleMeta = user ? (ROLE_META[user.role] ?? ROLE_META.patient) : null;
    const initials = user?.full_name
        ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

    const sidebarBody = (
        <div className="flex flex-col h-full" style={{ background: 'var(--sb-bg)' }}>

            {/* ── Brand ─────────────────────────────────────── */}
            <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--sb-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Logo mark */}
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                        boxShadow: 'var(--shadow-teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', lineHeight: 1.2 }}>
                            Rady Children's
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--sb-muted)', marginTop: 1, fontWeight: 500 }}>
                            GenAI Assistant
                        </p>
                    </div>
                    {/* Mobile close */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden"
                        style={{
                            width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-subtle)',
                            background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="var(--slate-500)" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Navigation ────────────────────────────────── */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
                {loading ? (
                    <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[80, 64, 72, 56, 68].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
                        ))}
                    </div>
                ) : !user ? (
                    <p style={{ padding: '24px 12px', fontSize: 13, color: 'var(--sb-muted)' }}>
                        Please sign in to continue.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {visibleGroups.map(group => (
                            <div key={group.label}>
                                {/* Group label */}
                                <p style={{
                                    padding: '0 10px 6px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: 'var(--sb-group-label)',
                                }}>
                                    {group.label}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {group.items.map(item => {
                                        const isActive = pathname === item.path;
                                        return (
                                            <Link key={item.name} href={item.path} style={{ textDecoration: 'none' }}>
                                                <div
                                                    className="nav-item"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '9px 10px',
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        background: isActive ? 'var(--sb-active-bg)' : 'transparent',
                                                        border: isActive ? `1px solid var(--teal-100)` : '1px solid transparent',
                                                        position: 'relative',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover-bg)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                    }}
                                                >
                                                    {/* Color dot */}
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                                                        background: isActive ? `${item.color}18` : 'var(--slate-100)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'background 0.12s',
                                                        color: isActive ? item.color : 'var(--slate-500)',
                                                    }}>
                                                        {item.icon}
                                                    </div>

                                                    <span style={{
                                                        flex: 1,
                                                        fontSize: 13.5,
                                                        fontWeight: isActive ? 600 : 500,
                                                        color: isActive ? 'var(--sb-active-text)' : 'var(--sb-text)',
                                                        letterSpacing: '-0.01em',
                                                    }}>
                                                        {item.name}
                                                    </span>

                                                    {/* Active indicator pip */}
                                                    {isActive && (
                                                        <div style={{
                                                            width: 5, height: 5, borderRadius: '50%',
                                                            background: 'var(--teal-500)',
                                                            flexShrink: 0,
                                                        }} />
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </nav>

            {/* ── Footer ────────────────────────────────────── */}
            <div style={{ padding: '12px 10px 20px', borderTop: '1px solid var(--sb-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* System status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 8,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                }}>
                    <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
                        <span style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: '#22C55E', animation: 'ping 1.5s ease infinite',
                            opacity: 0.5,
                        }} />
                        <span style={{ position: 'relative', borderRadius: '50%', background: '#16A34A', width: 8, height: 8 }} />
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#166534' }}>All systems operational</span>
                </div>

                {/* User card */}
                {loading ? (
                    <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
                ) : user && roleMeta ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'var(--slate-50)', border: '1px solid var(--border-subtle)',
                    }}>
                        {/* Avatar */}
                        <div style={{
                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                            background: roleMeta.bg, border: `1px solid ${roleMeta.color}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: roleMeta.color,
                        }}>
                            {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.full_name}
                            </p>
                            <p style={{ fontSize: 11, color: roleMeta.color, fontWeight: 600, marginTop: 2 }}>
                                {roleMeta.label}
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Call clinic — patients only */}
                {user?.role === 'patient' && (
                    <a href="tel:+18585761700" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        padding: '9px 0', borderRadius: 8, textDecoration: 'none',
                        background: '#F0FDF4', border: '1px solid #86EFAC',
                        fontSize: 13, fontWeight: 600, color: '#166534',
                        transition: 'all 0.12s',
                    }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DCFCE7'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0FDF4'; }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call Clinic
                    </a>
                )}

                {/* Sign out */}
                <button
                    onClick={async () => {
                        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
                        window.location.href = '/login';
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        padding: '9px 0', borderRadius: 8, width: '100%',
                        background: 'transparent', border: '1px solid var(--border-subtle)',
                        fontSize: 13, fontWeight: 500, color: 'var(--slate-500)',
                        cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#FFF1F2';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#FECDD3';
                        (e.currentTarget as HTMLButtonElement).style.color = '#BE123C';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-500)';
                    }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden"
                style={{
                    position: 'fixed', top: 14, left: 14, zIndex: 50,
                    width: 38, height: 38, borderRadius: 9,
                    background: 'white', border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                }}
            >
                <svg width="16" height="16" fill="none" stroke="var(--slate-700)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden"
                    style={{
                        position: 'fixed', inset: 0, zIndex: 40,
                        background: 'rgba(15,23,42,0.3)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop sidebar */}
            <div
                className="hidden md:flex"
                style={{
                    width: 232, height: '100vh', flexDirection: 'column', flexShrink: 0,
                    background: 'var(--sb-bg)',
                    borderRight: '1px solid var(--sb-border)',
                    boxShadow: '1px 0 0 0 var(--border-subtle)',
                }}
            >
                {sidebarBody}
            </div>

            {/* Mobile sidebar */}
            <div
                className="md:hidden"
                style={{
                    position: 'fixed', inset: '0 auto 0 0', zIndex: 50,
                    width: 240,
                    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.26s cubic-bezier(.22,1,.36,1)',
                    background: 'var(--sb-bg)',
                    borderRight: '1px solid var(--sb-border)',
                    boxShadow: 'var(--shadow-xl)',
                }}
            >
                {sidebarBody}
            </div>
        </>
    );
}
