'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'doctor' | 'patient';
  patient_id?: string | null;
}

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <button onClick={logout} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Logout</button>
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">Loading…</div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Current User</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="text-gray-500">Name:</span> {user?.full_name}</p>
                <p><span className="text-gray-500">Email:</span> {user?.email}</p>
                <p><span className="text-gray-500">Role:</span> {user?.role}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Quick Links</h2>
              <div className="flex flex-col gap-2">
                <a className="text-blue-600 hover:underline" href="/appointments">View Appointments</a>
                <a className="text-blue-600 hover:underline" href="/ehr">EHR (Doctors/Owners)</a>
              </div>
            </div>

            {/* Placeholders for specialties and assignments to be implemented in Phase 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 md:col-span-2">
              <h2 className="font-semibold text-gray-900 mb-3">Specialties & Assignments</h2>
              <p className="text-sm text-gray-600">Coming next: manage pediatric specialties and assign doctors to patients.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
