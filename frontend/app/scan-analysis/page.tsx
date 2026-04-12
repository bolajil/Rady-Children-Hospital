'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanResult {
  body_region: string;
  findings: string;
  impression: string;
  recommendations: string;
  scan_type: string;
  confidence_note: string;
  analysis_source?: 'ai' | 'demo';
}

const SCAN_TYPES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Fluoroscopy', 'Other'];

const SEVERITY_COLORS: Record<string, string> = {
  findings: 'border-blue-200 bg-blue-50',
  impression: 'border-teal-200 bg-teal-50',
  recommendations: 'border-violet-200 bg-violet-50',
};

export default function ScanAnalysisPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanType, setScanType] = useState('X-Ray');
  const [clinicalContext, setClinicalContext] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }
    setFile(f);
    setResult(null);
    setError('');
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('scan_type', scanType);
      form.append('clinical_context', clinicalContext);

      const res = await fetch('/api/scan-analysis', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
        throw new Error(err.detail || 'Analysis failed');
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!result) return;
    const text = [
      `SCAN ANALYSIS REPORT`,
      `Type: ${result.scan_type} | Region: ${result.body_region}`,
      ``,
      `FINDINGS:`,
      result.findings,
      ``,
      `IMPRESSION:`,
      result.impression,
      ``,
      `RECOMMENDATIONS:`,
      result.recommendations,
      ``,
      `AI CONFIDENCE NOTE:`,
      result.confidence_note,
      ``,
      `⚠️ This is an AI-assisted preliminary reading. Review by a qualified radiologist required before clinical use.`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scan Analysis</h1>
              <p className="text-sm text-gray-500">AI-assisted preliminary reading · X-Ray · CT · MRI · Ultrasound</p>
            </div>
          </div>

          {/* Disclaimer banner */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              For decision support only. All AI readings must be reviewed and confirmed by a qualified radiologist before clinical use.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Upload & Controls ── */}
          <div className="space-y-4">

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-teal-500 bg-teal-50 scale-[1.01]'
                  : preview
                  ? 'border-teal-400 bg-teal-50/40'
                  : 'border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50/20'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="Scan preview"
                    className="max-h-56 mx-auto rounded-xl shadow-md object-contain"
                  />
                  <div>
                    <p className="text-sm font-medium text-teal-700">{file?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Click to replace image</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Drop scan image here</p>
                    <p className="text-sm text-gray-400 mt-1">PNG, JPEG, WebP · Screenshots of DICOM viewers accepted</p>
                  </div>
                  <div className="inline-flex items-center px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg">
                    Browse Files
                  </div>
                </div>
              )}
            </div>

            {/* Scan Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Type</label>
              <div className="flex flex-wrap gap-2">
                {SCAN_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setScanType(type)}
                    className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-all ${
                      scanType === type
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Context */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Clinical Context <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                placeholder="e.g., 8-year-old with fever and cough for 5 days. R/O pneumonia."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white transition-shadow"
                rows={3}
              />
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyze}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing scan with AI...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze Scan
                </>
              )}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Results ── */}
          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">Analysis Results</h2>
                        {result.analysis_source === 'ai' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full uppercase">GPT-4 Vision</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full uppercase">Demo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{result.scan_type} · {result.body_region}</p>
                    </div>
                    <button
                      onClick={copyReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Report
                        </>
                      )}
                    </button>
                  </div>

                  {/* Findings */}
                  <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Findings</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.findings}</p>
                  </div>

                  {/* Impression */}
                  <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Impression</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.impression}</p>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-xl border border-violet-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Recommendations</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.recommendations}</p>
                  </div>

                  {/* AI confidence note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-700 leading-relaxed">{result.confidence_note}</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[360px]"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-semibold">Upload a scan to begin</p>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-[220px]">AI findings, impression &amp; recommendations will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
