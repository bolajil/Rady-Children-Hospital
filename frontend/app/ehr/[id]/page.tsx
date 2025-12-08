'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
    address: string;
    emergency_contact: {
        name: string;
        relationship: string;
        phone: string;
    };
}

interface HealthRecord {
    vitals: {
        height: string;
        weight: string;
        blood_pressure: string;
        heart_rate: string;
        temperature: string;
        respiratory_rate: string;
        oxygen_saturation: string;
        last_updated: string;
    };
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        start_date: string;
        end_date?: string;
        prescriber: string;
        status: string;
    }>;
    allergies: string[];
    diagnoses: Array<{
        condition: string;
        date: string;
        status: string;
        icd_code?: string;
    }>;
}

interface ChatMessage {
    type: 'human' | 'ai' | 'unknown';
    content: string;
    timestamp?: string;
}

interface ChatHistory {
    patient_id: string;
    patient_name?: string;
    messages: ChatMessage[];
    total: number;
    note?: string;
}

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistory | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchPatientData();
    }, [patientId]);

    // Fetch chat history when switching to AI Chat tab
    useEffect(() => {
        if (activeTab === 'ai-chat' && !chatHistory && !chatLoading) {
            fetchChatHistory();
        }
    }, [activeTab]);

    const fetchChatHistory = async () => {
        setChatLoading(true);
        try {
            const res = await fetch(`/api/ehr/patients/${patientId}/chat-history`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data);
            }
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
        } finally {
            setChatLoading(false);
        }
    };

    const fetchPatientData = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            // Fetch patient details
            const patientRes = await fetch(`/api/ehr/patients/${patientId}`);
            if (!patientRes.ok) throw new Error('Patient not found');
            const patientData = await patientRes.json();
            setPatient(patientData);

            // Fetch health records
            const recordsRes = await fetch(`/api/ehr/patients/${patientId}/records`);
            if (recordsRes.ok) {
                const recordsData = await recordsRes.json();
                setHealthRecord(recordsData);
            }
        } catch (err) {
            setError('Failed to load patient data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <p className="text-red-600">{error || 'Patient not found'}</p>
                        <button
                            onClick={() => router.push('/ehr')}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            ← Back to Patient List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '👤' },
        { id: 'vitals', name: 'Vitals', icon: '💓' },
        { id: 'medications', name: 'Medications', icon: '💊' },
        { id: 'history', name: 'History', icon: '📋' },
        { id: 'ai-chat', name: 'AI Chat History', icon: '💬' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/ehr')}
                    className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Patients
                </button>

                {/* Patient Header */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="flex items-start gap-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl ${patient.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'
                            }`}>
                            {patient.first_name[0]}{patient.last_name[0]}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {patient.first_name} {patient.last_name}
                            </h1>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">MRN</p>
                                    <p className="font-medium text-gray-900">{patient.mrn}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Age</p>
                                    <p className="font-medium text-gray-900">{patient.age} years</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Gender</p>
                                    <p className="font-medium text-gray-900">{patient.gender}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">DOB</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(patient.date_of_birth).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-md mb-6">
                    <div className="border-b border-gray-200">
                        <div className="flex gap-2 p-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="mr-2">{tab.icon}</span>
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Contact Information */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-bold text-gray-900 mb-4">Contact Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <p className="text-gray-600">Phone</p>
                                                <p className="font-medium text-gray-900">{patient.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Email</p>
                                                <p className="font-medium text-gray-900">{patient.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Address</p>
                                                <p className="font-medium text-gray-900">{patient.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-bold text-gray-900 mb-4">Emergency Contact</h3>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <p className="text-gray-600">Name</p>
                                                <p className="font-medium text-gray-900">{patient.emergency_contact.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Relationship</p>
                                                <p className="font-medium text-gray-900">{patient.emergency_contact.relationship}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Phone</p>
                                                <p className="font-medium text-gray-900">{patient.emergency_contact.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Allergies */}
                                {healthRecord && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Allergies
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {healthRecord.allergies.map((allergy, index) => (
                                                <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                                    {allergy}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Vitals Tab */}
                        {activeTab === 'vitals' && healthRecord && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(healthRecord.vitals).map(([key, value]) => {
                                    if (key === 'last_updated') return null;
                                    return (
                                        <div key={key} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                                            <p className="text-sm text-gray-600 mb-1 capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Medications Tab */}
                        {activeTab === 'medications' && healthRecord && (
                            <div className="space-y-4">
                                {healthRecord.medications.map((med, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-gray-900 text-lg">{med.name}</h4>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${med.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {med.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600">Dosage</p>
                                                <p className="font-medium text-gray-900">{med.dosage}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Frequency</p>
                                                <p className="font-medium text-gray-900">{med.frequency}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Start Date</p>
                                                <p className="font-medium text-gray-900">{med.start_date}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Prescriber</p>
                                                <p className="font-medium text-gray-900">{med.prescriber}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && healthRecord && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 mb-4">Active Diagnoses</h3>
                                {healthRecord.diagnoses.map((diagnosis, index) => (
                                    <div key={index} className="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{diagnosis.condition}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Diagnosed: {diagnosis.date}
                                                    {diagnosis.icd_code && ` • ICD-10: ${diagnosis.icd_code}`}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${diagnosis.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {diagnosis.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI Chat History Tab */}
                        {activeTab === 'ai-chat' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900">Patient's AI Chat History</h3>
                                    <button
                                        onClick={fetchChatHistory}
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Refresh
                                    </button>
                                </div>
                                
                                <p className="text-sm text-gray-500 mb-4">
                                    View questions this patient has asked the AI assistant. This helps you understand their concerns and prepare for consultations.
                                </p>

                                {chatLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : chatHistory?.note ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                                        {chatHistory.note}
                                    </div>
                                ) : chatHistory ? (
                                    <div>
                                        {chatHistory.messages.length > 0 ? (
                                            <div className="space-y-3">
                                                {chatHistory.messages.map((msg, index) => (
                                                    <div
                                                        key={index}
                                                        className={`rounded-lg p-4 ${
                                                            msg.type === 'human'
                                                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                                                : 'bg-gray-50 border-l-4 border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`text-xs font-semibold uppercase ${
                                                                msg.type === 'human' ? 'text-blue-600' : 'text-gray-500'
                                                            }`}>
                                                                {msg.type === 'human' ? '🧑 Patient Question' : '🤖 AI Response'}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                <p className="font-medium">No chat history found</p>
                                                <p className="text-sm mt-1">This patient hasn't used the AI assistant yet.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
