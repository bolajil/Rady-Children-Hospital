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

export default function EHRPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            // Use Next.js API proxy so dev rewrites work and we avoid browser CORS
            const response = await fetch(`/api/ehr/patients`);
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `Failed to fetch patients (status ${response.status})`);
            }
            const data = await response.json();
            setPatients(data);
        } catch (err) {
            setError('Failed to load patients');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(patient =>
        `${patient.first_name} ${patient.last_name} ${patient.mrn}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Electronic Health Records</h1>
                    <p className="text-gray-600">View and manage patient health records</p>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or MRN..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Patient Grid */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPatients.map((patient, index) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link href={`/ehr/${patient.id}`}>
                                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 cursor-pointer border border-gray-200 hover:border-blue-500">
                                        {/* Patient Avatar */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${patient.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'
                                                }`}>
                                                {patient.first_name[0]}{patient.last_name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {patient.first_name} {patient.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                                            </div>
                                        </div>

                                        {/* Patient Info */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Age:</span>
                                                <span className="font-medium text-gray-900">{patient.age} years</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Gender:</span>
                                                <span className="font-medium text-gray-900">{patient.gender}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">DOB:</span>
                                                <span className="font-medium text-gray-900">
                                                    {new Date(patient.date_of_birth).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* View Records Button */}
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                                                View Records →
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredPatients.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-600">No patients found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
