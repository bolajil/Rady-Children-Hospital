'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.detail || body?.error || 'Login failed');

            const meRes = await fetch('/api/auth/me');
            const me = await meRes.json().catch(() => null);
            const role = me?.user?.role;
            if (role === 'owner') router.replace('/admin');
            else if (role === 'doctor') router.replace('/ehr');
            else if (role === 'nurse') router.replace('/nurse');
            else if (role === 'patient') router.replace('/appointments');
            else router.replace('/');
        } catch (err: any) {
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#0D1117' }}>

            {/* ── Left panel — brand ──────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0D1117 0%, #0F1F35 60%, #0A1628 100%)' }}>

                {/* Background grid */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />

                {/* Glow orbs */}
                <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #00C4D5, transparent 70%)' }} />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #2563EB, transparent 70%)' }} />

                {/* Logo top-left */}
                <div className="relative z-10 p-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #00C4D5 0%, #2563EB 100%)',
                            boxShadow: '0 0 20px rgba(0,160,175,0.4)',
                        }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">Rady Children's</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>GenAI Medical Assistant</p>
                    </div>
                </div>

                {/* Center content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-14 text-center">
                    {/* Large glowing icon */}
                    <div className="relative mb-10">
                        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
                            style={{ background: 'linear-gradient(135deg, #00C4D5, #2563EB)', transform: 'scale(1.4)' }} />
                        <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(0,196,213,0.2), rgba(37,99,235,0.2))', border: '1px solid rgba(0,196,213,0.3)' }}>
                            <svg className="w-12 h-12" style={{ color: '#00C4D5' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-3" style={{ color: '#F1F5F9' }}>
                        Clinical AI,<br />Built for Children
                    </h2>
                    <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        AI-powered tools for faster diagnosis, smarter medication guidance, and effortless reporting.
                    </p>

                    {/* Feature pills */}
                    <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
                        {[
                            { icon: '🔬', text: 'AI Scan Analysis' },
                            { icon: '💊', text: 'Pediatric Medication Guide' },
                            { icon: '📋', text: 'Smart Report Builder' },
                        ].map(f => (
                            <div key={f.text} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.65)',
                                }}>
                                <span>{f.icon}</span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HIPAA badge bottom */}
                <div className="relative z-10 p-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgba(52,211,153,0.85)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        HIPAA Compliant · PHI Protected
                    </div>
                </div>
            </div>

            {/* ── Right panel — form ──────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
                style={{ background: '#161B22' }}>
                <div className="w-full max-w-md">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #00C4D5, #2563EB)', boxShadow: '0 0 16px rgba(0,160,175,0.4)' }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Rady Children's</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>GenAI Medical Assistant</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2" style={{ color: '#F1F5F9' }}>Sign in</h1>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Access your clinical workspace
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                                style={{ color: 'rgba(255,255,255,0.45)' }}>Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="doctor@example.com"
                                    required
                                    suppressHydrationWarning
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all"
                                    style={{
                                        background: '#21262D',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        color: '#E2E8F0',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#00A0AF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,160,175,0.18)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                                style={{ color: 'rgba(255,255,255,0.45)' }}>Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    suppressHydrationWarning
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all"
                                    style={{
                                        background: '#21262D',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        color: '#E2E8F0',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#00A0AF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,160,175,0.18)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #00C4D5 0%, #2563EB 100%)',
                                    color: '#fff',
                                    boxShadow: '0 0 24px rgba(0,160,175,0.35)',
                                }}
                                suppressHydrationWarning
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing in…
                                    </span>
                                ) : 'Sign In'}
                            </button>
                        </div>
                    </form>

                    {/* Demo credentials */}
                    <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Demo accounts</p>
                        <div className="space-y-2">
                            {[
                                { label: 'Doctor', email: 'doctor@example.com', pw: 'doctorpass' },
                                { label: 'Nurse', email: 'nurse@example.com', pw: 'nursepass' },
                                { label: 'Admin', email: 'owner@example.com', pw: 'ownerpass' },
                                { label: 'Patient (Emma)', email: 'emma.parent@example.com', pw: 'patient1' },
                                { label: 'Patient (Liam)', email: 'liam.parent@example.com', pw: 'patient2' },
                            ].map(d => (
                                <button
                                    key={d.label}
                                    type="button"
                                    onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.03)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                >
                                    <span className="font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.label}</span>
                                    <span>{d.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer note */}
                    <p className="mt-8 text-center text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
                        Protected health information is encrypted and access-logged per HIPAA.
                    </p>
                </div>
            </div>
        </div>
    );
}
