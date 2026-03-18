'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─────────────────────────────────────────────────── */

interface MedInfo {
  name: string;
  drug_class: string;
  indications: string;
  pediatric_dosing: string;
  side_effects: string;
  contraindications: string;
  monitoring: string;
  notes: string;
}

interface InteractionItem {
  drug_pair: string;
  severity: string;
  mechanism: string;
  clinical_effect: string;
  management: string;
}

interface InteractionResult {
  overall_severity: string;
  interactions: InteractionItem[];
  summary: string;
  recommendations: string;
}

interface DosingResult {
  medication_name: string;
  indication: string;
  dose_per_kg: string;
  calculated_dose: string;
  frequency: string;
  route: string;
  max_dose: string;
  duration: string;
  special_instructions: string;
  cautions: string;
}

/* ─── Severity helpers ───────────────────────────────────────── */

const SEVERITY_STYLES: Record<string, string> = {
  none: 'bg-green-100 text-green-700 border-green-200',
  mild: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  moderate: 'bg-orange-100 text-orange-700 border-orange-200',
  severe: 'bg-red-100 text-red-700 border-red-200',
};

const SEVERITY_DOT: Record<string, string> = {
  none: 'bg-green-500',
  mild: 'bg-yellow-400',
  moderate: 'bg-orange-500',
  severe: 'bg-red-500',
};

function SeverityBadge({ level }: { level: string }) {
  const style = SEVERITY_STYLES[level] || SEVERITY_STYLES.none;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[level] || 'bg-gray-400'}`} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

/* ─── Info row ───────────────────────────────────────────────── */

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className={`text-xs font-bold uppercase tracking-wider mb-1 ${accent || 'text-gray-400'}`}>{label}</dt>
      <dd className="text-sm text-gray-700 leading-relaxed">{value || 'Not available'}</dd>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

type Tab = 'search' | 'interactions' | 'dosing';

export default function MedicationGuidePage() {
  const [activeTab, setActiveTab] = useState<Tab>('search');

  /* Drug Search state */
  const [searchName, setSearchName] = useState('');
  const [searchAge, setSearchAge] = useState('');
  const [searchWeight, setSearchWeight] = useState('');
  const [searchIndication, setSearchIndication] = useState('');
  const [medInfo, setMedInfo] = useState<MedInfo | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  /* Interaction state */
  const [interactionMeds, setInteractionMeds] = useState<string[]>(['', '']);
  const [interactionAge, setInteractionAge] = useState('');
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState('');

  /* Dosing state */
  const [dosingMed, setDosingMed] = useState('');
  const [dosingIndication, setDosingIndication] = useState('');
  const [dosingAge, setDosingAge] = useState('');
  const [dosingWeight, setDosingWeight] = useState('');
  const [dosingRenalImpaired, setDosingRenalImpaired] = useState(false);
  const [dosingHepaticImpaired, setDosingHepaticImpaired] = useState(false);
  const [dosingResult, setDosingResult] = useState<DosingResult | null>(null);
  const [dosingLoading, setDosingLoading] = useState(false);
  const [dosingError, setDosingError] = useState('');

  /* ── Search ── */
  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch('/api/medications/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_name: searchName.trim(),
          patient_age_years: searchAge ? parseFloat(searchAge) : undefined,
          patient_weight_kg: searchWeight ? parseFloat(searchWeight) : undefined,
          indication: searchIndication || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(e.detail);
      }
      setMedInfo(await res.json());
    } catch (err: any) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  /* ── Interactions ── */
  const addMed = () => setInteractionMeds(m => [...m, '']);
  const removeMed = (i: number) => setInteractionMeds(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, val: string) =>
    setInteractionMeds(m => m.map((v, idx) => (idx === i ? val : v)));

  const checkInteractions = async () => {
    const meds = interactionMeds.filter(m => m.trim());
    if (meds.length < 2) {
      setInteractionError('Add at least 2 medications.');
      return;
    }
    setInteractionLoading(true);
    setInteractionError('');
    try {
      const res = await fetch('/api/medications/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: meds,
          patient_age_years: interactionAge ? parseFloat(interactionAge) : undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(e.detail);
      }
      setInteractionResult(await res.json());
    } catch (err: any) {
      setInteractionError(err.message || 'Interaction check failed');
    } finally {
      setInteractionLoading(false);
    }
  };

  /* ── Dosing ── */
  const calculateDosing = async () => {
    if (!dosingMed.trim() || !dosingAge || !dosingWeight) {
      setDosingError('Medication name, age, and weight are required.');
      return;
    }
    setDosingLoading(true);
    setDosingError('');
    try {
      const res = await fetch('/api/medications/dosing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_name: dosingMed.trim(),
          indication: dosingIndication || 'General use',
          patient_age_years: parseFloat(dosingAge),
          patient_weight_kg: parseFloat(dosingWeight),
          renal_impairment: dosingRenalImpaired,
          hepatic_impairment: dosingHepaticImpaired,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: 'Failed' }));
        throw new Error(e.detail);
      }
      setDosingResult(await res.json());
    } catch (err: any) {
      setDosingError(err.message || 'Dosing calculation failed');
    } finally {
      setDosingLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'search', label: 'Drug Info', icon: '💊' },
    { id: 'interactions', label: 'Interactions', icon: '⚠️' },
    { id: 'dosing', label: 'Dosing Calc', icon: '⚖️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medication Guide</h1>
              <p className="text-sm text-gray-500">Pediatric drug info · Interaction checker · Weight-based dosing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 font-medium">
              AI-generated guidance. Always verify doses with Harriet Lane, Lexicomp, or clinical pharmacist before prescribing.
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Drug Info Tab ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Search Form */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Search Medication</h2>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Medication Name <span className="text-red-500">*</span></label>
                  <input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., amoxicillin, ibuprofen, metformin"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Age (years)</label>
                    <input type="number" min="0" max="21" step="0.5" value={searchAge} onChange={(e) => setSearchAge(e.target.value)}
                      placeholder="e.g., 8" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Weight (kg)</label>
                    <input type="number" min="0" step="0.1" value={searchWeight} onChange={(e) => setSearchWeight(e.target.value)}
                      placeholder="e.g., 25" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Indication (optional)</label>
                  <input value={searchIndication} onChange={(e) => setSearchIndication(e.target.value)}
                    placeholder="e.g., community-acquired pneumonia"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                </div>

                <button onClick={handleSearch} disabled={!searchName.trim() || searchLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  {searchLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Search</>}
                </button>
                {searchError && <p className="text-sm text-red-600">{searchError}</p>}
              </div>

              {/* Drug Info Result */}
              <AnimatePresence mode="wait">
                {medInfo ? (
                  <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
                      <h3 className="text-white font-bold">{medInfo.name}</h3>
                      <p className="text-blue-200 text-xs mt-0.5">{medInfo.drug_class}</p>
                    </div>
                    <dl className="px-5 divide-y divide-gray-100">
                      <InfoRow label="Indications" value={medInfo.indications} accent="text-blue-600" />
                      <InfoRow label="Pediatric Dosing" value={medInfo.pediatric_dosing} accent="text-teal-600" />
                      <InfoRow label="Side Effects" value={medInfo.side_effects} accent="text-orange-600" />
                      <InfoRow label="Contraindications" value={medInfo.contraindications} accent="text-red-600" />
                      <InfoRow label="Monitoring" value={medInfo.monitoring} accent="text-violet-600" />
                      <InfoRow label="Notes" value={medInfo.notes} accent="text-gray-500" />
                    </dl>
                  </motion.div>
                ) : (
                  <motion.div key="empty-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[320px] text-center p-8">
                    <span className="text-4xl mb-3">💊</span>
                    <p className="text-gray-500 font-semibold">Search for a medication</p>
                    <p className="text-xs text-gray-400 mt-1.5 max-w-[200px]">Pediatric dosing, interactions, and monitoring guidance</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Interactions Tab ── */}
          {activeTab === 'interactions' && (
            <motion.div key="interactions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Check Interactions</h2>

                <div className="space-y-2">
                  {interactionMeds.map((med, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={med} onChange={(e) => updateMed(i, e.target.value)}
                        placeholder={`Medication ${i + 1}`}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                      {interactionMeds.length > 2 && (
                        <button onClick={() => removeMed(i)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {interactionMeds.length < 8 && (
                    <button onClick={addMed} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add another medication
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Age (years, optional)</label>
                  <input type="number" min="0" max="21" step="0.5" value={interactionAge} onChange={(e) => setInteractionAge(e.target.value)}
                    placeholder="e.g., 12" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                </div>

                <button onClick={checkInteractions} disabled={interactionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  {interactionLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Check Interactions</>}
                </button>
                {interactionError && <p className="text-sm text-red-600">{interactionError}</p>}
              </div>

              <AnimatePresence mode="wait">
                {interactionResult ? (
                  <motion.div key="ixn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Interaction Report</h3>
                      <SeverityBadge level={interactionResult.overall_severity} />
                    </div>
                    <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto">
                      {interactionResult.interactions.length === 0 ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-sm text-green-700 font-medium">No significant interactions identified</span>
                        </div>
                      ) : (
                        interactionResult.interactions.map((ixn, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-bold text-gray-900">{ixn.drug_pair}</span>
                              <SeverityBadge level={ixn.severity} />
                            </div>
                            <p className="text-xs text-gray-500"><span className="font-semibold">Mechanism:</span> {ixn.mechanism}</p>
                            <p className="text-xs text-gray-700"><span className="font-semibold">Effect:</span> {ixn.clinical_effect}</p>
                            <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2"><span className="font-semibold">Management:</span> {ixn.management}</p>
                          </div>
                        ))
                      )}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
                        <p className="text-sm text-gray-700">{interactionResult.summary}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Recommendations</p>
                        <p className="text-sm text-blue-800">{interactionResult.recommendations}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty-ixn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[320px] text-center p-8">
                    <span className="text-4xl mb-3">⚠️</span>
                    <p className="text-gray-500 font-semibold">Enter medications to check</p>
                    <p className="text-xs text-gray-400 mt-1.5">Interaction severity, mechanism &amp; management will appear here</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Dosing Calculator Tab ── */}
          {activeTab === 'dosing' && (
            <motion.div key="dosing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Weight-Based Dosing Calculator</h2>

                {[
                  { label: 'Medication Name *', val: dosingMed, setter: setDosingMed, placeholder: 'e.g., amoxicillin' },
                  { label: 'Indication *', val: dosingIndication, setter: setDosingIndication, placeholder: 'e.g., otitis media' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input value={f.val} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Age (years) *', val: dosingAge, setter: setDosingAge, placeholder: 'e.g., 4' },
                    { label: 'Weight (kg) *', val: dosingWeight, setter: setDosingWeight, placeholder: 'e.g., 16' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                      <input type="number" min="0" step="0.1" value={f.val} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  {[
                    { label: 'Renal Impairment', val: dosingRenalImpaired, setter: setDosingRenalImpaired },
                    { label: 'Hepatic Impairment', val: dosingHepaticImpaired, setter: setDosingHepaticImpaired },
                  ].map(f => (
                    <label key={f.label} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={f.val} onChange={(e) => f.setter(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600">{f.label}</span>
                    </label>
                  ))}
                </div>

                <button onClick={calculateDosing} disabled={dosingLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  {dosingLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Calculating...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Calculate Dose</>}
                </button>
                {dosingError && <p className="text-sm text-red-600">{dosingError}</p>}
              </div>

              <AnimatePresence mode="wait">
                {dosingResult ? (
                  <motion.div key="dose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3">
                      <h3 className="text-white font-bold">{dosingResult.medication_name}</h3>
                      <p className="text-teal-200 text-xs">{dosingResult.indication}</p>
                    </div>
                    <div className="p-5">
                      {/* Calculated dose highlight */}
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-center">
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Calculated Dose</p>
                        <p className="text-2xl font-bold text-teal-800">{dosingResult.calculated_dose}</p>
                        <p className="text-sm text-teal-600 mt-0.5">{dosingResult.frequency} · {dosingResult.route}</p>
                      </div>
                      <dl>
                        <InfoRow label="Dose per kg" value={dosingResult.dose_per_kg} accent="text-teal-600" />
                        <InfoRow label="Maximum Dose" value={dosingResult.max_dose} accent="text-orange-600" />
                        <InfoRow label="Duration" value={dosingResult.duration} accent="text-blue-600" />
                        <InfoRow label="Special Instructions" value={dosingResult.special_instructions} accent="text-violet-600" />
                        <InfoRow label="Cautions" value={dosingResult.cautions} accent="text-red-600" />
                      </dl>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty-dose" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[320px] text-center p-8">
                    <span className="text-4xl mb-3">⚖️</span>
                    <p className="text-gray-500 font-semibold">Enter patient details to calculate</p>
                    <p className="text-xs text-gray-400 mt-1.5 max-w-[220px]">Weight-based dose, route, frequency &amp; max dose will appear here</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
