'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
}

const GENDER_GRADIENT: Record<string, string> = {
    Female: 'linear-gradient(135deg, #EC4899, #A855F7)',
    Male:   'linear-gradient(135deg, #3B82F6, #06B6D4)',
};

export default function EHRPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        try {
            const response = await fetch('/api/ehr/patients');
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `Failed to fetch patients (status ${response.status})`);
            }
            setPatients(await response.json());
        } catch (err) {
            setError('Failed to load patients. Check that the backend is running.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = patients.filter(p =>
        `${p.first_name} ${p.last_name} ${p.mrn}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 md:p-8" style={{ background: '#0D1117' }}>
            <div className="max-w-7xl mx-auto">

                {/* ── Header ─────────────────────────────────────── */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                            style={{ color: '#00C4D5' }}>Patient Management</p>
                        <h1 className="text-3xl font-bold" style={{ color: '#F1F5F9' }}>Health Records</h1>
                        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            View and manage electronic patient records
                        </p>
                    </div>

                    {/* Stats pill */}
                    {!loading && !error && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                            style={{ background: 'rgba(0,196,213,0.08)', border: '1px solid rgba(0,196,213,0.2)', color: '#00C4D5' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-semibold">{patients.length}</span>
                            <span style={{ color: 'rgba(0,196,213,0.65)' }}>patients</span>
                        </div>
                    )}
                </div>

                {/* ── Search ─────────────────────────────────────── */}
                <div className="mb-6 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name or MRN…"
                        className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all md:max-w-md"
                        style={{
                            background: '#161B22',
                            border: '1px solid rgba(255,255,255,0.09)',
                            color: '#E2E8F0',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#00A0AF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,160,175,0.15)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                </div>

                {/* ── Error ──────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl mb-6 text-sm"
                        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}>
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* ── Loading skeleton ────────────────────────────── */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl p-6 space-y-4"
                                style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl skeleton" style={{ background: '#21262D' }} />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 rounded-lg skeleton" style={{ background: '#21262D' }} />
                                        <div className="h-3 w-20 rounded-lg skeleton" style={{ background: '#21262D' }} />
                                    </div>
                                </div>
                                <div className="space-y-2.5 pt-2">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="h-3 w-full rounded skeleton" style={{ background: '#21262D' }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Patient grid ────────────────────────────────── */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((patient, index) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                            >
                                <Link href={`/ehr/${patient.id}`}>
                                    <div className="group relative rounded-2xl p-6 cursor-pointer transition-all duration-200"
                                        style={{
                                            background: '#161B22',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(0,196,213,0.35)';
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)';
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                        }}
                                    >
                                        {/* Avatar + name */}
                                        <div className="flex items-start gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg"
                                                style={{ background: GENDER_GRADIENT[patient.gender] || GENDER_GRADIENT.Male }}>
                                                {patient.first_name[0]}{patient.last_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base truncate" style={{ color: '#F1F5F9' }}>
                                                    {patient.first_name} {patient.last_name}
                                                </h3>
                                                <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                                    MRN: {patient.mrn}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Info rows */}
                                        <div className="space-y-2 mb-5">
                                            {[
                                                { label: 'Age', value: `${patient.age} years` },
                                                { label: 'Gender', value: patient.gender },
                                                { label: 'DOB', value: new Date(patient.date_of_birth).toLocaleDateString() },
                                            ].map(row => (
                                                <div key={row.label} className="flex justify-between items-center">
                                                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{row.label}</span>
                                                    <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{row.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* CTA */}
                                        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                            <div className="flex items-center justify-between text-xs font-semibold transition-colors"
                                                style={{ color: '#00C4D5' }}>
                                                View Records
                                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* ── Empty state ─────────────────────────────────── */}
                {!loading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <svg className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>No patients found</p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="mt-3 text-xs"
                                style={{ color: '#00C4D5' }}>Clear search</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
