'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = [
    { label: 'Doctor',        email: 'doctor@example.com',     pw: 'doctorpass' },
    { label: 'Nurse',         email: 'nurse@example.com',      pw: 'nursepass'  },
    { label: 'Admin',         email: 'owner@example.com',      pw: 'ownerpass'  },
    { label: 'Patient (Emma)',email: 'emma.parent@example.com', pw: 'patient1'  },
    { label: 'Patient (Liam)',email: 'liam.parent@example.com', pw: 'patient2'  },
];

const FEATURES = [
    { label: 'AI Scan Analysis',         icon: '🔬' },
    { label: 'Pediatric Medication Guide',icon: '💊' },
    { label: 'Smart Report Builder',      icon: '📋' },
    { label: 'HIPAA-Compliant Audit Log', icon: '🛡️' },
];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res  = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.detail || body?.error || 'Login failed');
            const role = body?.user?.role;
            if (role === 'owner')   router.replace('/admin');
            else if (role === 'doctor')  router.replace('/ehr');
            else if (role === 'nurse')   router.replace('/nurse');
            else if (role === 'patient') router.replace('/appointments');
            else router.replace('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#F7F6F4' }}>

            {/* ── Left panel — brand ─────────────────────────────────── */}
            <div
                className="hidden lg:flex"
                style={{
                    width: '48%', flexDirection: 'column', position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(150deg, #F0FDFA 0%, #ECFEFF 50%, #F0F9FF 100%)',
                    borderRight: '1px solid #CCFBF1',
                }}
            >
                {/* Dot grid background */}
                <div className="dot-grid" style={{
                    position: 'absolute', inset: 0, opacity: 0.6,
                }} />

                {/* Topographic rings */}
                <div className="topo-pattern" style={{ position: 'absolute', inset: 0 }} />

                {/* Large teal circle — geometric anchor */}
                <div style={{
                    position: 'absolute', bottom: '-120px', right: '-80px',
                    width: 480, height: 480, borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(13,148,136,0.10) 0%, transparent 70%)',
                    border: '1px solid rgba(13,148,136,0.10)',
                }} />
                <div style={{
                    position: 'absolute', top: '-60px', left: '-60px',
                    width: 300, height: 300, borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(8,145,178,0.07) 0%, transparent 70%)',
                }} />

                {/* Logo */}
                <div style={{ position: 'relative', zIndex: 10, padding: '36px 44px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 11,
                            background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                            boxShadow: '0 4px 16px rgba(13,148,136,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>Rady Children's Hospital</p>
                            <p style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>San Diego, California</p>
                        </div>
                    </div>
                </div>

                {/* Center content */}
                <div style={{
                    position: 'relative', zIndex: 10, flex: 1,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', padding: '0 56px',
                }}>
                    {/* Heading */}
                    <div style={{ marginBottom: 40 }}>
                        <p style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                            textTransform: 'uppercase', color: '#0D9488', marginBottom: 12,
                        }}>
                            Clinical AI Platform
                        </p>
                        <h1 style={{
                            fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                            fontSize: 42, fontWeight: 700, lineHeight: 1.15,
                            color: '#0F172A', marginBottom: 16,
                            letterSpacing: '-0.02em',
                        }}>
                            Smarter care<br />
                            <span style={{ color: '#0D9488', fontStyle: 'italic' }}>starts here.</span>
                        </h1>
                        <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.65, maxWidth: 340 }}>
                            AI-powered tools designed for pediatric clinicians — from real-time diagnosis support to medication guidance.
                        </p>
                    </div>

                    {/* Feature list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {FEATURES.map(f => (
                            <div key={f.label} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 16px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.70)',
                                border: '1px solid rgba(13,148,136,0.12)',
                                backdropFilter: 'blur(8px)',
                            }}>
                                <span style={{ fontSize: 18 }}>{f.icon}</span>
                                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#334155' }}>{f.label}</span>
                                <div style={{ marginLeft: 'auto' }}>
                                    <svg width="14" height="14" fill="none" stroke="#0D9488" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HIPAA badge */}
                <div style={{ position: 'relative', zIndex: 10, padding: '0 44px 40px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '7px 14px', borderRadius: 99,
                        background: 'rgba(255,255,255,0.80)', border: '1px solid #BBF7D0',
                    }}>
                        <svg width="13" height="13" fill="none" stroke="#16A34A" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#166534' }}>
                            HIPAA Compliant · PHI Encrypted · Access Logged
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Right panel — form ─────────────────────────────────── */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '40px 32px', background: '#FFFFFF',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>

                    {/* Mobile logo */}
                    <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 9,
                            background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                            boxShadow: '0 4px 12px rgba(13,148,136,0.22)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Rady Children's</p>
                            <p style={{ fontSize: 11, color: '#64748B' }}>GenAI Assistant</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{
                            fontFamily: 'var(--font-fraunces, Fraunces, Georgia, serif)',
                            fontSize: 30, fontWeight: 700, color: '#0F172A',
                            letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8,
                        }}>
                            Sign in
                        </h2>
                        <p style={{ fontSize: 14, color: '#64748B' }}>
                            Access your clinical workspace
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                            background: '#FFF1F2', border: '1px solid #FECDD3',
                        }}>
                            <svg width="16" height="16" fill="none" stroke="#BE123C" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span style={{ fontSize: 13.5, color: '#9F1239', lineHeight: 1.4 }}>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Email field */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.01em' }}>
                                    Email address
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <svg width="15" height="15" fill="none" stroke={focusedField === 'email' ? '#0D9488' : '#94A3B8'} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="you@radychildrens.org"
                                        required
                                        suppressHydrationWarning
                                        style={{
                                            width: '100%', padding: '11px 14px 11px 38px',
                                            borderRadius: 9, fontSize: 14, outline: 'none',
                                            border: focusedField === 'email'
                                                ? '1.5px solid #0D9488'
                                                : '1.5px solid #E2E8F0',
                                            boxShadow: focusedField === 'email'
                                                ? '0 0 0 3px rgba(13,148,136,0.12)'
                                                : 'none',
                                            background: '#FAFAF9',
                                            color: '#0F172A',
                                            transition: 'border-color 0.12s, box-shadow 0.12s',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password field */}
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.01em' }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <svg width="15" height="15" fill="none" stroke={focusedField === 'password' ? '#0D9488' : '#94A3B8'} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="••••••••"
                                        required
                                        suppressHydrationWarning
                                        style={{
                                            width: '100%', padding: '11px 14px 11px 38px',
                                            borderRadius: 9, fontSize: 14, outline: 'none',
                                            border: focusedField === 'password'
                                                ? '1.5px solid #0D9488'
                                                : '1.5px solid #E2E8F0',
                                            boxShadow: focusedField === 'password'
                                                ? '0 0 0 3px rgba(13,148,136,0.12)'
                                                : 'none',
                                            background: '#FAFAF9',
                                            color: '#0F172A',
                                            transition: 'border-color 0.12s, box-shadow 0.12s',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '12px',
                                    borderRadius: 9, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                    background: loading ? '#94A3B8' : 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)',
                                    color: 'white', fontSize: 14, fontWeight: 700,
                                    letterSpacing: '0.01em',
                                    boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.30)',
                                    transition: 'all 0.15s',
                                    marginTop: 4,
                                }}
                                onMouseEnter={e => {
                                    if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                                }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Signing in…
                                    </span>
                                ) : 'Sign In →'}
                            </button>
                        </div>
                    </form>

                    {/* Demo accounts */}
                    <div style={{ marginTop: 28 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                        }}>
                            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Demo accounts
                            </span>
                            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {DEMO_ACCOUNTS.map(d => (
                                <button
                                    key={d.label}
                                    type="button"
                                    onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 7, border: '1px solid #F1F0EE',
                                        background: '#FAFAF9', cursor: 'pointer',
                                        transition: 'all 0.10s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = '#F0FDFA';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#CCFBF1';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF9';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#F1F0EE';
                                    }}
                                >
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{d.label}</span>
                                    <span style={{ fontSize: 11.5, color: '#94A3B8', fontFamily: 'var(--font-dm-mono, monospace)' }}>{d.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p style={{ marginTop: 28, textAlign: 'center', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5 }}>
                        Protected health information is encrypted<br />and access-logged per HIPAA regulations.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes ping {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50%       { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
