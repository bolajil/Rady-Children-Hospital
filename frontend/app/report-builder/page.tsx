'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportForm {
  report_type: string;
  patient_name: string;
  patient_age: string;
  patient_mrn: string;
  patient_dob: string;
  chief_complaint: string;
  history_of_present_illness: string;
  past_medical_history: string;
  allergies: string;
  current_medications: string;
  vital_signs: string;
  physical_exam: string;
  lab_results: string;
  imaging_findings: string;
  assessment: string;
  plan: string;
  doctor_name: string;
  department: string;
  additional_notes: string;
}

const TEMPLATES = [
  { id: 'soap', label: 'SOAP Note', icon: '📋', description: 'Subjective · Objective · Assessment · Plan' },
  { id: 'discharge', label: 'Discharge Summary', icon: '🏥', description: 'Hospital course & follow-up instructions' },
  { id: 'referral', label: 'Referral Letter', icon: '📨', description: 'Formal specialist referral' },
  { id: 'progress', label: 'Progress Note', icon: '📈', description: 'Interval update during admission' },
  { id: 'consult', label: 'Consultation Note', icon: '🩺', description: 'Response to consult request' },
  { id: 'procedure', label: 'Procedure Note', icon: '⚕️', description: 'Documentation of a procedure' },
];

const EMPTY_FORM: ReportForm = {
  report_type: 'soap',
  patient_name: '', patient_age: '', patient_mrn: '', patient_dob: '',
  chief_complaint: '', history_of_present_illness: '', past_medical_history: '',
  allergies: '', current_medications: '', vital_signs: '', physical_exam: '',
  lab_results: '', imaging_findings: '', assessment: '', plan: '',
  doctor_name: '', department: '', additional_notes: '',
};

type FieldDef = { key: keyof ReportForm; label: string; multiline?: boolean; placeholder?: string };

const PATIENT_FIELDS: FieldDef[] = [
  { key: 'patient_name', label: 'Patient Name', placeholder: 'First Last' },
  { key: 'patient_age', label: 'Age', placeholder: 'e.g., 8 years' },
  { key: 'patient_dob', label: 'Date of Birth', placeholder: 'MM/DD/YYYY' },
  { key: 'patient_mrn', label: 'MRN', placeholder: 'Medical Record Number' },
];

const CLINICAL_FIELDS: FieldDef[] = [
  { key: 'chief_complaint', label: 'Chief Complaint', placeholder: 'Primary reason for visit' },
  { key: 'history_of_present_illness', label: 'History of Present Illness', multiline: true, placeholder: 'Onset, character, duration, associated symptoms...' },
  { key: 'past_medical_history', label: 'Past Medical History', multiline: true, placeholder: 'Prior diagnoses, hospitalizations, surgeries...' },
  { key: 'allergies', label: 'Allergies', placeholder: 'Medications, environmental, food' },
  { key: 'current_medications', label: 'Current Medications', multiline: true, placeholder: 'Name, dose, frequency, route' },
  { key: 'vital_signs', label: 'Vital Signs', placeholder: 'T, HR, RR, BP, SpO2, Weight' },
  { key: 'physical_exam', label: 'Physical Examination', multiline: true, placeholder: 'Systematic examination findings...' },
  { key: 'lab_results', label: 'Laboratory Results', multiline: true, placeholder: 'CBC, CMP, cultures, etc.' },
  { key: 'imaging_findings', label: 'Imaging / Radiology Findings', multiline: true, placeholder: 'Paste scan analysis or radiology report...' },
  { key: 'assessment', label: 'Assessment', multiline: true, placeholder: 'Diagnosis or differential diagnoses...' },
  { key: 'plan', label: 'Plan', multiline: true, placeholder: 'Medications, orders, follow-up, patient education...' },
  { key: 'additional_notes', label: 'Additional Notes', multiline: true, placeholder: 'Anything else to include...' },
];

const PROVIDER_FIELDS: FieldDef[] = [
  { key: 'doctor_name', label: 'Attending Physician', placeholder: 'Dr. First Last, MD' },
  { key: 'department', label: 'Department / Service', placeholder: 'e.g., Pediatric Emergency, Cardiology' },
];

export default function ReportBuilderPage() {
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [printed, setPrinted] = useState(false);

  const update = (key: keyof ReportForm, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
        throw new Error(err.detail || 'Generation failed');
      }
      const data = await res.json();
      setReport(data.report || '');
    } catch (err: any) {
      setError(err.message || 'Report generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const template = TEMPLATES.find(t => t.id === form.report_type);
    w.document.write(`<!DOCTYPE html><html><head><title>${template?.label || 'Clinical Note'}</title>
<style>body{font-family:'Arial',sans-serif;margin:40px;font-size:13px;line-height:1.6;color:#1a1a1a}
h1{font-size:16px;margin-bottom:4px}pre{white-space:pre-wrap;font-family:inherit}
.header{border-bottom:2px solid #0D9488;padding-bottom:12px;margin-bottom:20px}
.footer{border-top:1px solid #ddd;margin-top:20px;padding-top:8px;font-size:11px;color:#666}
</style></head><body>
<div class="header"><h1>Rady Children's Hospital — ${template?.label || 'Clinical Note'}</h1>
<p>Patient: ${form.patient_name || '[Name]'} | MRN: ${form.patient_mrn || '[MRN]'} | Date: ${new Date().toLocaleDateString()}</p></div>
<pre>${report.replace(/</g, '&lt;')}</pre>
<div class="footer">Generated by Rady GenAI · ${new Date().toLocaleString()} · For clinical use only · Verify before filing</div>
</body></html>`);
    w.document.close();
    w.print();
    setPrinted(true);
    setTimeout(() => setPrinted(false), 2000);
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === form.report_type);

  return (
    <div className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
              <p className="text-sm text-gray-500">Generate clinical documentation from structured inputs</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Left: Form ── */}
          <div className="space-y-5">

            {/* Template Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Report Type</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => update('report_type', t.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      form.report_type === t.id
                        ? 'border-violet-500 bg-violet-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                    }`}
                  >
                    <span className="text-xl mb-1">{t.icon}</span>
                    <span className={`text-sm font-semibold ${form.report_type === t.id ? 'text-violet-700' : 'text-gray-700'}`}>
                      {t.label}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Info */}
            <FieldSection title="Patient Information" fields={PATIENT_FIELDS} form={form} update={update} />

            {/* Provider Info */}
            <FieldSection title="Provider & Department" fields={PROVIDER_FIELDS} form={form} update={update} />

            {/* Clinical Details */}
            <FieldSection title="Clinical Information" fields={CLINICAL_FIELDS} form={form} update={update} />

            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating report...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate {selectedTemplate?.label || 'Report'}
                </>
              )}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Generated Report ── */}
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {report ? (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  {/* Action bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedTemplate?.label}</h2>
                      <p className="text-xs text-gray-500">
                        {form.patient_name || 'Patient'} {form.patient_mrn ? `· MRN ${form.patient_mrn}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
                      >
                        {copied ? (
                          <><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copied</span></>
                        ) : (
                          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                        )}
                      </button>
                      <button
                        onClick={printReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm shadow-sm transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                      </button>
                    </div>
                  </div>

                  {/* Report content */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-2.5 flex items-center gap-2">
                      <span className="text-white text-sm font-semibold">Rady Children's Hospital</span>
                      <span className="text-violet-300 text-sm">·</span>
                      <span className="text-violet-200 text-sm">{selectedTemplate?.label}</span>
                    </div>
                    <textarea
                      value={report}
                      onChange={(e) => setReport(e.target.value)}
                      className="w-full p-5 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none min-h-[500px]"
                      spellCheck={true}
                    />
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    You can edit the report above before copying or printing · Verify all clinical details before chart filing
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[420px] p-8"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-semibold">No report generated yet</p>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-[240px] leading-relaxed">
                    Fill in the clinical information on the left and click Generate to create your note
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable field section component
function FieldSection({
  title, fields, form, update,
}: {
  title: string;
  fields: FieldDef[];
  form: ReportForm;
  update: (key: keyof ReportForm, val: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h2>
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
          {f.multiline ? (
            <textarea
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors"
            />
          ) : (
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          )}
        </div>
      ))}
    </div>
  );
}
