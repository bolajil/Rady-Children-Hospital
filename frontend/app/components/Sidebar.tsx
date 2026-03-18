'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'doctor' | 'patient';
    patient_id?: string;
}

/* ── Nav-item group definition ────────────────────────────────── */
interface NavItem {
    name: string;
    path: string;
    roles: string[];
    accent: string;          // Tailwind gradient classes for icon bg
    icon: React.ReactNode;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const ICON_CLS = 'w-[18px] h-[18px]';

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            {
                name: 'Admin',
                path: '/admin',
                roles: ['owner'],
                accent: 'from-violet-500 to-indigo-500',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
            },
            {
                name: 'Chat',
                path: '/',
                roles: ['owner', 'doctor', 'patient'],
                accent: 'from-teal-400 to-cyan-500',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
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
                accent: 'from-blue-500 to-blue-600',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            },
            {
                name: 'Appointments',
                path: '/appointments',
                roles: ['owner', 'doctor', 'patient'],
                accent: 'from-emerald-400 to-teal-500',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                accent: 'from-sky-500 to-blue-600',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                ),
            },
            {
                name: 'Report Builder',
                path: '/report-builder',
                roles: ['owner', 'doctor'],
                accent: 'from-orange-400 to-amber-500',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                ),
            },
            {
                name: 'Medication Guide',
                path: '/medication-guide',
                roles: ['owner', 'doctor'],
                accent: 'from-rose-500 to-pink-500',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Compliance',
        items: [
            {
                name: 'HIPAA',
                path: '/compliance',
                roles: ['owner'],
                accent: 'from-slate-500 to-slate-600',
                icon: (
                    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
            },
        ],
    },
];

/* ── Role badge colors ────────────────────────────────────────── */
const ROLE_META: Record<string, { label: string; gradient: string }> = {
    owner:   { label: 'Administrator', gradient: 'from-violet-500 to-indigo-500' },
    doctor:  { label: 'Clinician',     gradient: 'from-teal-400  to-cyan-500'   },
    patient: { label: 'Patient',       gradient: 'from-emerald-400 to-teal-500' },
};

/* ── Component ────────────────────────────────────────────────── */
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
        items: user
            ? group.items.filter(i => i.roles.includes(user.role))
            : [],
    })).filter(g => g.items.length > 0);

    const roleMeta = user ? (ROLE_META[user.role] ?? ROLE_META.patient) : null;
    const initials = user?.full_name
        ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';

    /* ── Sidebar body ─────────────────────────────────────────── */
    const sidebarBody = (
        <div className="flex flex-col h-full" style={{ background: 'var(--sb-bg)' }}>

            {/* ── Brand header ──────────────────────────────── */}
            <div className="relative px-5 pt-6 pb-5 overflow-hidden">
                {/* ambient glow */}
                <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full opacity-20 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #00C4D5, transparent)' }} />

                <div className="relative flex items-center gap-3">
                    {/* logo mark */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #00C4D5 0%, #2563EB 100%)', boxShadow: '0 0 20px rgba(0,160,175,0.5)' }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight">Rady Children's</p>
                        <p className="text-xs font-medium" style={{ color: 'var(--sb-muted)' }}>GenAI Assistant</p>
                    </div>

                    {/* mobile close */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden p-1.5 rounded-lg transition-colors"
                        style={{ background: 'var(--sb-surface)' }}
                    >
                        <svg className="w-4 h-4" style={{ color: 'var(--sb-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* divider */}
                <div className="mt-5 h-px" style={{ background: 'var(--sb-border)' }} />
            </div>

            {/* ── Navigation ────────────────────────────────── */}
            <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-5">
                {loading ? (
                    /* skeleton */
                    <div className="space-y-2 px-2 pt-2">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
                                <div className="w-8 h-8 rounded-lg skeleton" style={{ background: 'var(--sb-surface)' }} />
                                <div className="h-3 rounded-full w-24 skeleton" style={{ background: 'var(--sb-surface)' }} />
                            </div>
                        ))}
                    </div>
                ) : !user ? (
                    <p className="px-3 py-6 text-xs" style={{ color: 'var(--sb-muted)' }}>Please log in to continue.</p>
                ) : (
                    visibleGroups.map(group => (
                        <div key={group.label}>
                            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
                                style={{ color: 'var(--sb-muted)' }}>
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map(item => {
                                    const isActive = pathname === item.path;
                                    return (
                                        <Link key={item.name} href={item.path}>
                                            <div className={`nav-item relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group ${isActive ? 'active' : ''}`}
                                                style={{
                                                    background: isActive ? 'var(--sb-active-bg)' : 'transparent',
                                                    color: isActive ? '#fff' : 'var(--sb-text)',
                                                }}>

                                                {/* active left bar */}
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                                                        style={{ background: 'var(--sb-active-accent)' }} />
                                                )}

                                                {/* icon */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity bg-gradient-to-br ${item.accent} ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
                                                    style={{ boxShadow: isActive ? '0 0 12px rgba(0,160,175,0.35)' : 'none' }}>
                                                    <div className="text-white">{item.icon}</div>
                                                </div>

                                                <span className={`text-sm font-medium transition-colors ${isActive ? 'text-white' : ''}`}
                                                    style={{ color: isActive ? '#fff' : 'var(--sb-text)' }}>
                                                    {item.name}
                                                </span>

                                                {isActive && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full"
                                                        style={{ background: 'var(--sb-active-accent)' }} />
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </nav>

            {/* ── Footer ────────────────────────────────────── */}
            <div className="px-3 pb-5 space-y-3">

                {/* system status */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--sb-surface)', border: '1px solid var(--sb-border)' }}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                            style={{ background: '#10B981' }} />
                        <span className="relative inline-flex rounded-full h-2 w-2"
                            style={{ background: '#10B981' }} />
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'rgba(16,185,129,0.9)' }}>System Online</span>
                </div>

                {/* user card */}
                {loading ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--sb-surface)' }}>
                        <div className="w-9 h-9 rounded-full skeleton" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-20 rounded skeleton" style={{ background: 'rgba(255,255,255,0.1)' }} />
                            <div className="h-2.5 w-14 rounded skeleton" style={{ background: 'rgba(255,255,255,0.07)' }} />
                        </div>
                    </div>
                ) : user ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-default"
                        style={{ background: 'var(--sb-surface)', border: '1px solid var(--sb-border)' }}>
                        {/* avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm bg-gradient-to-br ${roleMeta?.gradient}`}>
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--sb-muted)' }}>{roleMeta?.label}</p>
                        </div>
                    </div>
                ) : null}

                {/* call clinic — patients only */}
                {user?.role === 'patient' && (
                    <a href="tel:+18585761700"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call Clinic
                    </a>
                )}

                {/* logout */}
                <button
                    onClick={async () => {
                        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
                        window.location.href = '/login';
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                        background: 'rgba(239,68,68,0.12)',
                        color: 'rgba(252,165,165,0.9)',
                        border: '1px solid rgba(239,68,68,0.20)',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.22)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                    }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg border transition-colors"
                style={{
                    background: 'var(--sb-bg)',
                    borderColor: 'var(--sb-border)',
                }}
            >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop sidebar */}
            <div className="hidden md:flex h-screen w-64 flex-col shadow-2xl flex-shrink-0"
                style={{ background: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)' }}>
                {sidebarBody}
            </div>

            {/* Mobile sidebar */}
            <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: 'var(--sb-bg)' }}>
                {sidebarBody}
            </div>
        </>
    );
}
