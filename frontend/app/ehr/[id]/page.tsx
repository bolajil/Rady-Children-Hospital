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

interface DoctorNote {
    id: string;
    patientId: string;
    doctorName: string;
    dateTime: string;
    planOfCare: string;
    recommendations: string[];
    monitoring: string[];
    status: 'active' | 'discharged' | 'pending';
    priority: 'routine' | 'urgent' | 'stat';
}

interface NurseNote {
    id: string;
    patientId: string;
    nurseName: string;
    nurseId: string;
    dateTime: string;
    category: 'vitals_concern' | 'medication_issue' | 'behavior_change' | 'pain' | 'family_request' | 'other';
    urgency: 'routine' | 'urgent' | 'critical';
    note: string;
    status: 'pending' | 'acknowledged' | 'resolved';
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
    const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
    const [nurseNotes, setNurseNotes] = useState<NurseNote[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    // Load nurse notes from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('nurseNotes');
        if (saved) {
            const allNotes: NurseNote[] = JSON.parse(saved);
            setNurseNotes(allNotes.filter(n => n.patientId === patientId));
        }
    }, [patientId]);

    // Mock doctor notes data
    const MOCK_DOCTOR_NOTES: Record<string, DoctorNote[]> = {
        'P001': [{
            id: 'DN001', patientId: 'P001', doctorName: 'Dr. Amanda Foster', dateTime: '2024-04-07 08:30',
            planOfCare: 'Continue antibiotics therapy. Monitor respiratory status closely. Consider chest X-ray if no improvement in 48 hours.',
            recommendations: ['Albuterol nebulizer Q4H PRN', 'Increase fluid intake', 'Elevate head of bed 30 degrees'],
            monitoring: ['SpO2 every 2 hours', 'Respiratory rate Q4H', 'Temperature Q4H', 'Breath sounds assessment each shift'],
            status: 'active', priority: 'routine'
        }],
        'P002': [{
            id: 'DN002', patientId: 'P002', doctorName: 'Dr. Robert Kim', dateTime: '2024-04-07 09:15',
            planOfCare: 'Post-reduction care for left forearm fracture. Pain management and neurovascular checks.',
            recommendations: ['Acetaminophen 15mg/kg Q6H for pain', 'Ice pack 20 min on/off', 'Keep arm elevated'],
            monitoring: ['Pain level Q4H using FACES scale', 'Capillary refill and sensation in fingers Q2H', 'Cast integrity check'],
            status: 'active', priority: 'routine'
        }],
        'P003': [{
            id: 'DN003', patientId: 'P003', doctorName: 'Dr. Patricia Nguyen', dateTime: '2024-04-07 07:00',
            planOfCare: 'Pre-operative preparation for appendectomy scheduled for 14:00 today. NPO status confirmed.',
            recommendations: ['NPO strictly enforced', 'IV fluids at maintenance rate', 'Pre-op checklist completion', 'Consent verified'],
            monitoring: ['Vital signs Q2H', 'Pain assessment Q2H', 'Signs of perforation (increased pain, fever, rigidity)'],
            status: 'active', priority: 'urgent'
        }],
        'P004': [{
            id: 'DN004', patientId: 'P004', doctorName: 'Dr. Amanda Foster', dateTime: '2024-04-07 06:45',
            planOfCare: 'Severe asthma exacerbation. Continuous monitoring required. Consider ICU transfer if no improvement.',
            recommendations: ['Continuous albuterol nebulizer', 'Methylprednisolone 2mg/kg IV Q6H', 'Magnesium sulfate if needed', 'Oxygen to maintain SpO2 >94%'],
            monitoring: ['Continuous SpO2 monitoring', 'Peak flow Q2H when able', 'Respiratory assessment Q1H', 'ABG if worsening'],
            status: 'active', priority: 'stat'
        }],
    };

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
            // Fetch patient details
            const patientRes = await fetch(`/api/ehr/patients/${patientId}`);
            if (patientRes.ok) {
                const patientData = await patientRes.json();
                setPatient(patientData);

                // Fetch health records
                const recordsRes = await fetch(`/api/ehr/patients/${patientId}/records`);
                if (recordsRes.ok) {
                    const recordsData = await recordsRes.json();
                    setHealthRecord(recordsData);
                }
            } else {
                // Use mock data if API fails
                const mockPatients: Record<string, Patient> = {
                    'P001': { id: 'P001', mrn: 'MRN-2024-001', first_name: 'Emma', last_name: 'Johnson', date_of_birth: '2018-05-15', age: 6, gender: 'Female', phone: '(555) 123-4567', email: 'parent@email.com', address: '123 Main St, San Diego, CA', emergency_contact: { name: 'John Johnson', relationship: 'Father', phone: '(555) 123-4568' } },
                    'P002': { id: 'P002', mrn: 'MRN-2024-002', first_name: 'Liam', last_name: 'Smith', date_of_birth: '2016-03-22', age: 8, gender: 'Male', phone: '(555) 234-5678', email: 'parent2@email.com', address: '456 Oak Ave, San Diego, CA', emergency_contact: { name: 'Sarah Smith', relationship: 'Mother', phone: '(555) 234-5679' } },
                    'P003': { id: 'P003', mrn: 'MRN-2024-003', first_name: 'Olivia', last_name: 'Williams', date_of_birth: '2019-11-08', age: 5, gender: 'Female', phone: '(555) 345-6789', email: 'parent3@email.com', address: '789 Pine St, San Diego, CA', emergency_contact: { name: 'Mike Williams', relationship: 'Father', phone: '(555) 345-6780' } },
                    'P004': { id: 'P004', mrn: 'MRN-2024-004', first_name: 'Noah', last_name: 'Brown', date_of_birth: '2020-07-14', age: 4, gender: 'Male', phone: '(555) 456-7890', email: 'parent4@email.com', address: '321 Elm St, San Diego, CA', emergency_contact: { name: 'Lisa Brown', relationship: 'Mother', phone: '(555) 456-7891' } },
                    'P005': { id: 'P005', mrn: 'MRN-2024-005', first_name: 'Ava', last_name: 'Davis', date_of_birth: '2017-01-30', age: 7, gender: 'Female', phone: '(555) 567-8901', email: 'parent5@email.com', address: '654 Maple Dr, San Diego, CA', emergency_contact: { name: 'Tom Davis', relationship: 'Father', phone: '(555) 567-8902' } },
                    'P006': { id: 'P006', mrn: 'MRN-2024-006', first_name: 'James', last_name: 'Miller', date_of_birth: '2015-09-12', age: 9, gender: 'Male', phone: '(555) 678-9012', email: 'parent6@email.com', address: '987 Cedar Ln, San Diego, CA', emergency_contact: { name: 'Amy Miller', relationship: 'Mother', phone: '(555) 678-9013' } },
                    'P007': { id: 'P007', mrn: 'MRN-2024-007', first_name: 'Sophia', last_name: 'Wilson', date_of_birth: '2021-04-25', age: 3, gender: 'Female', phone: '(555) 789-0123', email: 'parent7@email.com', address: '147 Birch St, San Diego, CA', emergency_contact: { name: 'Dan Wilson', relationship: 'Father', phone: '(555) 789-0124' } },
                    'P008': { id: 'P008', mrn: 'MRN-2024-008', first_name: 'Benjamin', last_name: 'Moore', date_of_birth: '2014-12-03', age: 10, gender: 'Male', phone: '(555) 890-1234', email: 'parent8@email.com', address: '258 Walnut Ave, San Diego, CA', emergency_contact: { name: 'Kate Moore', relationship: 'Mother', phone: '(555) 890-1235' } },
                };
                const mockPatient = mockPatients[patientId];
                if (mockPatient) {
                    setPatient(mockPatient);
                    setHealthRecord({
                        vitals: { height: '120 cm', weight: '25 kg', blood_pressure: '95/60', heart_rate: '90 bpm', temperature: '98.6°F', respiratory_rate: '20/min', oxygen_saturation: '98%', last_updated: new Date().toISOString() },
                        medications: [{ name: 'Amoxicillin', dosage: '250mg', frequency: 'Every 8 hours', start_date: '2024-03-01', prescriber: 'Dr. Smith', status: 'Active' }],
                        allergies: ['Penicillin'],
                        diagnoses: [{ condition: 'Respiratory Infection', date: '2024-03-01', status: 'Active', icd_code: 'J06.9' }],
                    });
                    // Load doctor notes for this patient
                    setDoctorNotes(MOCK_DOCTOR_NOTES[patientId] || []);
                } else {
                    throw new Error('Patient not found');
                }
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
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => router.push('/nurse')}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ background: 'rgba(0,196,213,0.15)', color: '#0891B2' }}
                            >
                                ← Nurse Station
                            </button>
                            <button
                                onClick={() => router.push('/ehr')}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                                All Patients
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '👤' },
        { id: 'doctor-orders', name: "Doctor's Orders", icon: '📝' },
        { id: 'nurse-notes', name: 'Nurse Notes', icon: '🩺', badge: nurseNotes.length > 0 ? nurseNotes.length : undefined },
        { id: 'vitals', name: 'Vitals', icon: '💓' },
        { id: 'medications', name: 'Medications', icon: '💊' },
        { id: 'history', name: 'History', icon: '📋' },
        { id: 'ai-chat', name: 'AI Chat History', icon: '💬' },
    ];

    const getPriorityStyle = (priority: DoctorNote['priority']) => {
        switch (priority) {
            case 'stat': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '🚨 STAT' };
            case 'urgent': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: '⚠️ Urgent' };
            default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: '📋 Routine' };
        }
    };

    const getNurseNoteUrgencyStyle = (urgency: NurseNote['urgency']) => {
        switch (urgency) {
            case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '🚨 Critical' };
            case 'urgent': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: '⚠️ Urgent' };
            default: return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: '📝 Routine' };
        }
    };

    const NOTE_CATEGORY_LABELS: Record<NurseNote['category'], string> = {
        'vitals_concern': '💓 Vitals Concern',
        'medication_issue': '💊 Medication Issue',
        'behavior_change': '🧠 Behavior Change',
        'pain': '😣 Pain',
        'family_request': '👨‍👩‍👧 Family Request',
        'other': '📋 Other',
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Navigation Buttons */}
                <div className="mb-6 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/nurse')}
                        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                        style={{ background: 'rgba(0,196,213,0.15)', color: '#00C4D5' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Nurse Station
                    </button>
                    <button
                        onClick={() => router.push('/ehr')}
                        className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all"
                        style={{ background: 'rgba(0,0,0,0.05)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        All Patients
                    </button>
                </div>

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

                        {/* Doctor's Orders Tab */}
                        {activeTab === 'doctor-orders' && (
                            <div className="space-y-6">
                                {doctorNotes.length > 0 ? (
                                    doctorNotes.map((note) => {
                                        const priorityStyle = getPriorityStyle(note.priority);
                                        return (
                                            <div key={note.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                                                {/* Note Header */}
                                                <div className={`p-4 ${priorityStyle.bg} border-b ${priorityStyle.border}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}>
                                                                {priorityStyle.label}
                                                            </span>
                                                            <span className="font-semibold text-gray-900">{note.doctorName}</span>
                                                        </div>
                                                        <span className="text-sm text-gray-600">{note.dateTime}</span>
                                                    </div>
                                                </div>

                                                {/* Plan of Care */}
                                                <div className="p-5 border-b border-gray-100">
                                                    <h4 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                                                        📋 Plan of Care
                                                    </h4>
                                                    <p className="text-gray-800">{note.planOfCare}</p>
                                                </div>

                                                {/* Recommendations & Monitoring */}
                                                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                                    {/* Recommendations */}
                                                    <div className="p-5">
                                                        <h4 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                                                            ✅ Recommendations
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {note.recommendations.map((rec, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                                    <span className="text-green-500 mt-0.5">•</span>
                                                                    {rec}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Monitoring */}
                                                    <div className="p-5">
                                                        <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                                            👁️ Monitoring Instructions
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {note.monitoring.map((mon, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                                    <span className="text-amber-500 mt-0.5">•</span>
                                                                    {mon}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Status Footer */}
                                                <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Status: <span className="font-semibold text-green-600 capitalize">{note.status}</span></span>
                                                    <span className="text-gray-400">Last updated: {note.dateTime}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-3xl">📝</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Doctor's Orders</h3>
                                        <p className="text-gray-500">No active doctor's orders for this patient.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Nurse Notes Tab */}
                        {activeTab === 'nurse-notes' && (
                            <div className="space-y-4">
                                {nurseNotes.length > 0 ? (
                                    nurseNotes.map((note) => {
                                        const urgencyStyle = getNurseNoteUrgencyStyle(note.urgency);
                                        return (
                                            <div key={note.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                                                {/* Note Header */}
                                                <div className={`p-4 ${urgencyStyle.bg} border-b ${urgencyStyle.border}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${urgencyStyle.bg} ${urgencyStyle.text} border ${urgencyStyle.border}`}>
                                                                {urgencyStyle.label}
                                                            </span>
                                                            <span className="px-2 py-1 rounded bg-white/50 text-sm">
                                                                {NOTE_CATEGORY_LABELS[note.category]}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                note.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                note.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                            }`}>
                                                                {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Note Content */}
                                                <div className="p-5">
                                                    <p className="text-gray-800 text-sm leading-relaxed">{note.note}</p>
                                                </div>

                                                {/* Note Footer */}
                                                <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-sm border-t border-gray-100">
                                                    <span className="text-gray-600">
                                                        <span className="font-medium text-teal-600">{note.nurseName}</span>
                                                    </span>
                                                    <span className="text-gray-400">{note.dateTime}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-3xl">🩺</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Nurse Notes</h3>
                                        <p className="text-gray-500">No nurse notes have been added for this patient yet.</p>
                                        <p className="text-sm text-gray-400 mt-2">Nurses can add notes from the Nurse Station → My Patients tab.</p>
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
                                        <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <p className="text-sm text-gray-500 mb-1 capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">{String(value)}</p>
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
