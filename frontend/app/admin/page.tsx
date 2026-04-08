'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'doctor' | 'nurse' | 'patient';
  patient_id?: string | null;
}

interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  patient_id?: string | null;
}

const SYSTEM_USERS: SystemUser[] = [
  { id: 'UOWNER', email: 'owner@example.com', full_name: 'System Owner', role: 'owner' },
  { id: 'UDOCTOR', email: 'doctor@example.com', full_name: 'Dr. Demo', role: 'doctor' },
  { id: 'UNURSE', email: 'nurse@example.com', full_name: 'RN Sarah Chen', role: 'nurse' },
  { id: 'UP001', email: 'emma.parent@example.com', full_name: 'Emma Johnson Parent', role: 'patient', patient_id: 'P001' },
  { id: 'UP002', email: 'liam.parent@example.com', full_name: 'Liam Martinez Parent', role: 'patient', patient_id: 'P002' },
];

const STATS = {
  totalPatients: 8,
  activeAppointments: 12,
  totalUsers: 5,
  pendingNotes: 3,
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setUser(data?.user ?? null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'doctor': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'nurse': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'patient': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System administration and user management</p>
          </div>
          <button onClick={logout} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">
            Logout
          </button>
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">Loading…</div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-xl">👥</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{STATS.totalPatients}</p>
                    <p className="text-sm text-gray-500">Patients</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-xl">📅</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{STATS.activeAppointments}</p>
                    <p className="text-sm text-gray-500">Appointments</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span className="text-xl">🔐</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{STATS.totalUsers}</p>
                    <p className="text-sm text-gray-500">System Users</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <span className="text-xl">📝</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{STATS.pendingNotes}</p>
                    <p className="text-sm text-gray-500">Pending Notes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Current User */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">👤</span> Logged In As
                </h2>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><span className="text-gray-500">Name:</span> <span className="font-medium">{user?.full_name}</span></p>
                  <p><span className="text-gray-500">Email:</span> {user?.email}</p>
                  <p>
                    <span className="text-gray-500">Role:</span>{' '}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user?.role || '')}`}>
                      {user?.role?.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">🔗</span> Quick Navigation
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/ehr" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium">
                    <span>📋</span> Patient EHR
                  </Link>
                  <Link href="/appointments" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium">
                    <span>📅</span> Appointments
                  </Link>
                  <Link href="/nurse" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-sm font-medium">
                    <span>🩺</span> Nurse Station
                  </Link>
                  <Link href="/compliance" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium">
                    <span>🛡️</span> HIPAA Compliance
                  </Link>
                  <Link href="/medication-guide" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium">
                    <span>💊</span> Medications
                  </Link>
                  <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium">
                    <span>🤖</span> AI Assistant
                  </Link>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">⚡</span> System Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Backend API</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">AI Agent</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">PHI Guardrails</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">HIPAA Compliance</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Management */}
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-lg">👥</span> System Users
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Patient ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEM_USERS.map((sysUser) => (
                      <tr key={sysUser.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">{sysUser.id}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{sysUser.full_name}</td>
                        <td className="py-3 px-4 text-gray-600">{sysUser.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(sysUser.role)}`}>
                            {sysUser.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{sysUser.patient_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
