'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EditAppointmentModal from '../components/EditAppointmentModal';

interface Appointment {
    id: string;
    patient_id: string;
    patient_name: string;
    provider: string;
    appointment_type: string;
    date: string;
    duration: number;
    status: string;
    reason: string;
    notes?: string;
}

interface NewAppointmentForm {
    patient_id: string;
    patient_name: string;
    provider: string;
    appointment_type: string;
    date: string;
    time: string;
    duration: number;
    reason: string;
    notes: string;
}

const PROVIDERS = [
    'Dr. Sarah Smith',
    'Dr. Emily Rodriguez',
    'Dr. James Lee',
];

const APPOINTMENT_TYPES = [
    'Checkup',
    'Follow-up',
    'Urgent',
    'Consultation',
];

interface User {
    id: string;
    full_name: string;
    role: 'owner' | 'doctor' | 'patient';
    patient_id?: string;
}

const emptyForm: NewAppointmentForm = {
    patient_id: '',
    patient_name: '',
    provider: PROVIDERS[0],
    appointment_type: APPOINTMENT_TYPES[0],
    date: '',
    time: '09:00',
    duration: 30,
    reason: '',
    notes: '',
};

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<NewAppointmentForm>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Fetch current user on mount
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch(() => {})
            .finally(() => fetchAppointments());
    }, []);

    const fetchAppointments = async () => {
        try {
            const response = await fetch('/api/appointments/');
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `Failed to fetch appointments (status ${response.status})`);
            }
            const data = await response.json();
            setAppointments(data);
        } catch (err: any) {
            const message = err?.message || 'Failed to load appointments';
            setError(message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'duration' ? parseInt(value) || 30 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError('');

        try {
            // Combine date and time into ISO format
            const dateTime = new Date(`${formData.date}T${formData.time}:00`);

            const payload = {
                patient_id: formData.patient_id,
                patient_name: formData.patient_name,
                provider: formData.provider,
                appointment_type: formData.appointment_type,
                date: dateTime.toISOString(),
                duration: formData.duration,
                reason: formData.reason,
                notes: formData.notes || undefined,
            };

            const response = await fetch('/api/appointments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `Failed to create appointment (status ${response.status})`);
            }

            // Refresh appointments list
            await fetchAppointments();

            // Reset form and close modal
            setFormData(emptyForm);
            setShowModal(false);
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to create appointment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (id: string, updates: Partial<Appointment>) => {
        const response = await fetch(`/api/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(text || 'Failed to update appointment');
        }

        await fetchAppointments();
    };

    const openNewAppointmentModal = () => {
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        // Pre-fill patient info if user is a patient
        if (user?.role === 'patient' && user?.patient_id) {
            // Get patient name - remove "Parent" suffix from user's name
            // E.g., "Emma Johnson Parent" -> "Emma Johnson"
            const patientName = user.full_name?.replace(' Parent', '') || '';
            
            // Also try to get name from existing appointments
            const existingApt = appointments.find(a => a.patient_id === user.patient_id);
            const name = existingApt?.patient_name || patientName || `Patient ${user.patient_id}`;
            
            setFormData({ 
                ...emptyForm, 
                date: dateStr,
                patient_id: user.patient_id,
                patient_name: name,
            });
        } else {
            setFormData({ ...emptyForm, date: dateStr });
        }
        setSubmitError('');
        setShowModal(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'scheduled':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'urgent':
                return 'bg-red-50 border-l-4 border-red-500';
            case 'follow-up':
                return 'bg-blue-50 border-l-4 border-blue-500';
            case 'checkup':
                return 'bg-green-50 border-l-4 border-green-500';
            default:
                return 'bg-gray-50 border-l-4 border-gray-500';
        }
    };

    // Filter appointments - patients only see their own appointments
    const filteredAppointments = appointments.filter(apt => {
        // First filter by patient if user is a patient
        if (user?.role === 'patient' && user?.patient_id) {
            if (apt.patient_id !== user.patient_id) {
                return false;
            }
        }
        // Then filter by status
        return filterStatus === 'all' || apt.status === filterStatus;
    });

    const groupedAppointments = filteredAppointments.reduce((groups, apt) => {
        const date = new Date(apt.date).toLocaleDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(apt);
        return groups;
    }, {} as Record<string, Appointment[]>);

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header - stacked on mobile */}
                <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
                            {user?.role === 'patient' ? 'My Appointments' : 'Appointments'}
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            {user?.role === 'patient' ? 'View your scheduled appointments' : 'Manage patient appointments and schedules'}
                        </p>
                    </div>
                    <button
                        onClick={openNewAppointmentModal}
                        className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 min-h-[44px]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {user?.role === 'patient' ? 'Request Appointment' : 'New Appointment'}
                    </button>
                </div>

                {/* Filters - scrollable on mobile */}
                <div className="mb-4 md:mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all capitalize text-sm md:text-base min-h-[44px] ${filterStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
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

                {/* Appointments List */}
                {!loading && !error && (
                    <div className="space-y-8">
                        {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">{date}</h2>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-sm text-gray-500">{dayAppointments.length} appointments</span>
                                </div>

                                {/* Appointments for this date */}
                                <div className="space-y-4">
                                    {dayAppointments.map((apt, index) => (
                                        <motion.div
                                            key={apt.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`bg-white rounded-lg shadow-md p-6 ${getTypeColor(apt.appointment_type)}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    {/* Time and Patient */}
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <div className="text-2xl font-bold text-gray-900">
                                                            {new Date(apt.date).toLocaleTimeString('en-US', {
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-900">{apt.patient_name}</h3>
                                                            <p className="text-sm text-gray-600">{apt.provider}</p>
                                                        </div>
                                                    </div>

                                                    {/* Details - responsive grid */}
                                                    <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm mb-3">
                                                        <div>
                                                            <p className="text-gray-500 text-xs md:text-sm">Type</p>
                                                            <p className="font-medium text-gray-900 capitalize">{apt.appointment_type}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs md:text-sm">Duration</p>
                                                            <p className="font-medium text-gray-900">{apt.duration} min</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs md:text-sm">Reason</p>
                                                            <p className="font-medium text-gray-900 truncate">{apt.reason}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs md:text-sm">Status</p>
                                                            <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                                                                {apt.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Notes */}
                                                    {apt.notes && (
                                                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                                            <p className="text-gray-600 font-medium mb-1">Notes:</p>
                                                            <p className="text-gray-900">{apt.notes}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions - only for doctors/owners */}
                                                {user?.role !== 'patient' && (
                                                    <div className="flex flex-col gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleEdit(apt)}
                                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                                        >
                                                            Edit
                                                        </button>
                                                        {apt.status === 'scheduled' && (
                                                            <button className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                                                                Confirm
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredAppointments.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-600">No appointments found</p>
                    </div>
                )}
            </div>

            {/* New Appointment Modal - fullscreen on mobile */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center md:p-4 z-50"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white px-4 md:px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                                    {user?.role === 'patient' ? 'Request an Appointment' : 'Schedule New Appointment'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
                                {submitError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                                        <p className="text-red-600 text-sm">{submitError}</p>
                                    </div>
                                )}

                                {/* Patient Info - read-only for patients */}
                                {user?.role === 'patient' ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-800 font-medium">Requesting appointment for:</p>
                                        <p className="text-lg font-bold text-blue-900">{formData.patient_name}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Patient ID <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="patient_id"
                                                value={formData.patient_id}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="e.g., P001"
                                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Patient Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="patient_name"
                                                value={formData.patient_name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Full name"
                                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Provider and Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Provider <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="provider"
                                            value={formData.provider}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                        >
                                            {PROVIDERS.map((provider) => (
                                                <option key={provider} value={provider}>{provider}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Appointment Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="appointment_type"
                                            value={formData.appointment_type}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                        >
                                            {APPOINTMENT_TYPES.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Date, Time, Duration */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 md:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Time <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            name="time"
                                            value={formData.time}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 md:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Duration <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                        >
                                            <option value={15}>15 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={45}>45 min</option>
                                            <option value={60}>60 min</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason for Visit <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g., Annual checkup"
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes (optional)
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows={3}
                                        placeholder="Additional notes..."
                                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                {/* Actions - sticky on mobile */}
                                <div className="sticky bottom-0 bg-white flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-4 pb-4 md:pb-0 border-t border-gray-200 -mx-4 px-4 md:mx-0 md:px-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="w-full md:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium min-h-[44px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Scheduling...
                                            </>
                                        ) : (
                                            'Schedule Appointment'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            <EditAppointmentModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdate}
                appointment={selectedAppointment}
            />
        </div >
    );
}
