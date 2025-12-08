'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AuditEvent {
    id: string;
    timestamp: string;
    event_type: string;
    user_email: string;
    user_role: string;
    resource_type: string;
    resource_id: string | null;
    patient_id: string | null;
    is_violation: boolean;
    violation_severity: string | null;
    violation_reason: string | null;
}

interface Violation {
    id: string;
    timestamp: string;
    event_type: string;
    user_email: string;
    user_role: string;
    resource_type: string;
    resource_id: string | null;
    patient_id: string | null;
    severity: string | null;
    reason: string | null;
}

interface ComplianceSummary {
    total_events: number;
    today_events: number;
    total_violations: number;
    today_violations: number;
    violations_by_severity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    unique_users_today: number;
}

export default function CompliancePage() {
    const [summary, setSummary] = useState<ComplianceSummary | null>(null);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'violations' | 'audit'>('overview');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchComplianceData();
    }, []);

    const fetchComplianceData = async () => {
        setLoading(true);
        setError('');
        
        try {
            const [summaryRes, violationsRes, auditRes] = await Promise.all([
                fetch('/api/compliance/summary'),
                fetch('/api/compliance/violations'),
                fetch('/api/compliance/audit-log?limit=50'),
            ]);

            if (!summaryRes.ok || !violationsRes.ok || !auditRes.ok) {
                throw new Error('Failed to fetch compliance data. Make sure you are logged in as an admin.');
            }

            const summaryData = await summaryRes.json();
            const violationsData = await violationsRes.json();
            const auditData = await auditRes.json();

            setSummary(summaryData.summary);
            setViolations(violationsData.violations);
            setAuditLog(auditData.events);
        } catch (err: any) {
            setError(err.message || 'Failed to load compliance data');
        } finally {
            setLoading(false);
        }
    };

    const generateSampleEvents = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/compliance/demo/generate-sample-events', {
                method: 'POST',
            });
            if (res.ok) {
                await fetchComplianceData();
            }
        } catch (err) {
            console.error('Failed to generate sample events:', err);
        } finally {
            setGenerating(false);
        }
    };

    const getSeverityColor = (severity: string | null) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-lg font-bold text-red-800 mb-2">Access Denied</h2>
                        <p className="text-red-600">{error}</p>
                        <p className="text-red-600 mt-2 text-sm">Only administrators (owners) can view HIPAA compliance data.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">HIPAA Compliance Dashboard</h1>
                    </div>
                    <p className="text-gray-600">Monitor PHI access, audit logs, and potential violations</p>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm p-4 border border-gray-200"
                        >
                            <p className="text-sm text-gray-500 mb-1">Total Events</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.total_events}</p>
                            <p className="text-xs text-gray-400">{summary.today_events} today</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`rounded-xl shadow-sm p-4 border ${summary.total_violations > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                        >
                            <p className={`text-sm mb-1 ${summary.total_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>Violations</p>
                            <p className={`text-2xl font-bold ${summary.total_violations > 0 ? 'text-red-700' : 'text-green-700'}`}>{summary.total_violations}</p>
                            <p className={`text-xs ${summary.total_violations > 0 ? 'text-red-500' : 'text-green-500'}`}>{summary.today_violations} today</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm p-4 border border-gray-200"
                        >
                            <p className="text-sm text-gray-500 mb-1">Active Users</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.unique_users_today}</p>
                            <p className="text-xs text-gray-400">today</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`rounded-xl shadow-sm p-4 border ${summary.total_violations === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
                        >
                            <p className={`text-sm mb-1 ${summary.total_violations === 0 ? 'text-green-600' : 'text-yellow-600'}`}>Status</p>
                            <p className={`text-lg font-bold ${summary.total_violations === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                                {summary.total_violations === 0 ? '✓ Compliant' : '⚠ Review Needed'}
                            </p>
                        </motion.div>
                    </div>
                )}

                {/* Violation Severity Breakdown */}
                {summary && summary.total_violations > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">Violations by Severity</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-2xl font-bold text-red-700">{summary.violations_by_severity.critical}</p>
                                <p className="text-xs text-red-600">Critical</p>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-2xl font-bold text-orange-700">{summary.violations_by_severity.high}</p>
                                <p className="text-xs text-orange-600">High</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-2xl font-bold text-yellow-700">{summary.violations_by_severity.medium}</p>
                                <p className="text-xs text-yellow-600">Medium</p>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-2xl font-bold text-blue-700">{summary.violations_by_severity.low}</p>
                                <p className="text-xs text-blue-600">Low</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Demo Button */}
                <div className="mb-6">
                    <button
                        onClick={generateSampleEvents}
                        disabled={generating}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : '🧪 Generate Sample Events (Demo)'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['overview', 'violations', 'audit'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                                activeTab === tab
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {tab === 'audit' ? 'Audit Log' : tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
                        {auditLog.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No audit events recorded yet. Click "Generate Sample Events" to see a demo.</p>
                        ) : (
                            <div className="space-y-3">
                                {auditLog.slice(0, 10).map((event) => (
                                    <div
                                        key={event.id}
                                        className={`p-3 rounded-lg border ${event.is_violation ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`text-sm font-medium ${event.is_violation ? 'text-red-700' : 'text-gray-700'}`}>
                                                    {event.event_type.replace(/_/g, ' ')}
                                                </span>
                                                {event.is_violation && (
                                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(event.violation_severity)}`}>
                                                        {event.violation_severity}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {event.user_email} ({event.user_role}) - {event.resource_type}
                                            {event.patient_id && ` (Patient: ${event.patient_id})`}
                                        </p>
                                        {event.violation_reason && (
                                            <p className="text-sm text-red-600 mt-1">⚠ {event.violation_reason}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'violations' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">HIPAA Violations</h3>
                        {violations.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-600">No violations detected</p>
                                <p className="text-sm text-gray-400">All PHI access appears to be compliant</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {violations.map((violation) => (
                                    <div key={violation.id} className="p-4 rounded-lg bg-red-50 border border-red-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getSeverityColor(violation.severity)}`}>
                                                    {violation.severity?.toUpperCase()}
                                                </span>
                                                <span className="font-medium text-red-700">{violation.event_type.replace(/_/g, ' ')}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{formatTimestamp(violation.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-1">
                                            <strong>User:</strong> {violation.user_email} ({violation.user_role})
                                        </p>
                                        {violation.patient_id && (
                                            <p className="text-sm text-gray-700 mb-1">
                                                <strong>Patient:</strong> {violation.patient_id}
                                            </p>
                                        )}
                                        <p className="text-sm text-red-600 mt-2">
                                            <strong>Reason:</strong> {violation.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900">Full Audit Log</h3>
                        </div>
                        {auditLog.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No audit events recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Resource</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Patient</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {auditLog.map((event) => (
                                            <tr key={event.id} className={event.is_violation ? 'bg-red-50' : ''}>
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {formatTimestamp(event.timestamp)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900">
                                                    {event.event_type.replace(/_/g, ' ')}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {event.user_email}
                                                    <span className="text-xs text-gray-400 ml-1">({event.user_role})</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {event.resource_type}
                                                    {event.resource_id && <span className="text-gray-400">/{event.resource_id}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{event.patient_id || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {event.is_violation ? (
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(event.violation_severity)}`}>
                                                            {event.violation_severity}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                                                            OK
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
