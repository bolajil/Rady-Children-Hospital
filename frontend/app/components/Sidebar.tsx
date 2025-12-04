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

export default function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Don't show sidebar on login page
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        if (isLoginPage) {
            setLoading(false);
            return;
        }
        // Fetch current user info
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [isLoginPage]);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Don't render sidebar on login page
    if (isLoginPage) {
        return null;
    }

    // Define all nav items with role permissions
    const allNavItems = [
        {
            name: 'Admin Dashboard',
            path: '/admin',
            roles: ['owner'],
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            name: 'Chat',
            path: '/',
            roles: ['owner', 'doctor', 'patient'],
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
        },
        {
            name: 'Health Records',
            path: '/ehr',
            roles: ['owner', 'doctor'],
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            name: 'Appointments',
            path: '/appointments',
            roles: ['owner', 'doctor', 'patient'],
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    // Filter nav items based on user role
    const navItems = user
        ? allNavItems.filter(item => item.roles.includes(user.role))
        : [];

    const sidebarContent = (
        <>
            {/* Logo Section */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#00A0AF] to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-base text-gray-900">Rady Children's</h1>
                        <p className="text-xs text-gray-500">GenAI Assistant</p>
                    </div>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="ml-auto md:hidden p-2 rounded-lg hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
                    Main Menu
                </p>
                {loading ? (
                    <div className="px-3 py-4 text-sm text-gray-400 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        Loading...
                    </div>
                ) : !user ? (
                    <div className="px-3 py-4 text-sm text-gray-400">
                        Please log in
                    </div>
                ) : navItems.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400">
                        No menu items available
                    </div>
                ) : (
                    navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.name} href={item.path}>
                                <div
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                                        {item.icon}
                                    </div>
                                    <span className="font-medium text-sm">{item.name}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                )}
            </nav>

            {/* System Status */}
            <div className="p-4 border-t border-gray-200">
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-green-700">System Online</span>
                    </div>
                </div>

                {/* User Profile */}
                {loading ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-24"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                    </div>
                ) : user ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${user.role === 'owner' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                                user.role === 'doctor' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                    'bg-gradient-to-br from-green-500 to-green-600'
                            }`}>
                            <span className="font-bold text-sm text-white">
                                {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                                {user.full_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                                {user.role === 'owner' ? 'Administrator' :
                                    user.role === 'doctor' ? 'Clinician' : 'Patient'}
                            </p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                ) : null}

                {/* Call Clinic Button - mobile friendly */}
                <a
                    href="tel:+18585761700"
                    className="mt-3 w-full px-3 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Clinic
                </a>

                {/* Logout Button */}
                <button
                    onClick={async () => {
                        try {
                            await fetch('/api/auth/logout', { method: 'POST' });
                        } catch { }
                        window.location.href = '/login';
                    }}
                    className="mt-2 w-full px-3 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors min-h-[44px]"
                >
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
            >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop sidebar - always visible */}
            <div className="hidden md:flex h-screen w-72 bg-white border-r border-gray-200 flex-col shadow-sm">
                {sidebarContent}
            </div>

            {/* Mobile sidebar - slides in */}
            <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {sidebarContent}
            </div>
        </>
    );
}
