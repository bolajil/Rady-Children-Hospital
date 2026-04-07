'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────── */

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  gender: string;
  room?: string;
  bed?: string;
  diagnosis?: string;
  acuity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface Nurse {
  id: string;
  name: string;
  unit: string;
  shift: string;
  maxPatients: number;
  status: 'available' | 'busy' | 'break';
}

interface Assignment {
  nurseId: string;
  patientIds: string[];
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

type ActiveTab = 'dashboard' | 'my-patients' | 'tools';
type ActiveTool = 'vitals' | 'iv-calc' | 'med-admin' | 'handoff' | 'blood' | 'pain' | null;

/* ─── Constants ───────────────────────────────────────────────── */

const MOCK_NURSES: Nurse[] = [
  { id: 'N001', name: 'Sarah Johnson, RN', unit: 'Pediatric ICU', shift: 'Day', maxPatients: 4, status: 'available' },
  { id: 'N002', name: 'Michael Chen, RN', unit: 'Pediatric ICU', shift: 'Day', maxPatients: 4, status: 'available' },
  { id: 'N003', name: 'Emily Rodriguez, RN', unit: 'General Pediatrics', shift: 'Day', maxPatients: 6, status: 'busy' },
  { id: 'N004', name: 'James Wilson, RN', unit: 'General Pediatrics', shift: 'Day', maxPatients: 6, status: 'available' },
  { id: 'N005', name: 'Lisa Thompson, RN', unit: 'NICU', shift: 'Day', maxPatients: 3, status: 'break' },
  { id: 'N006', name: 'David Martinez, RN', unit: 'NICU', shift: 'Day', maxPatients: 3, status: 'available' },
];

const MOCK_PATIENTS: Patient[] = [
  { id: 'P001', mrn: 'MRN-2024-001', first_name: 'Emma', last_name: 'Johnson', date_of_birth: '2018-05-15', age: 6, gender: 'Female', room: '101', bed: 'A', acuity: 'Medium', diagnosis: 'Respiratory Infection' },
  { id: 'P002', mrn: 'MRN-2024-002', first_name: 'Liam', last_name: 'Smith', date_of_birth: '2016-03-22', age: 8, gender: 'Male', room: '101', bed: 'B', acuity: 'Low', diagnosis: 'Fracture' },
  { id: 'P003', mrn: 'MRN-2024-003', first_name: 'Olivia', last_name: 'Williams', date_of_birth: '2019-11-08', age: 5, gender: 'Female', room: '102', bed: 'A', acuity: 'High', diagnosis: 'Appendicitis' },
  { id: 'P004', mrn: 'MRN-2024-004', first_name: 'Noah', last_name: 'Brown', date_of_birth: '2020-07-14', age: 4, gender: 'Male', room: '102', bed: 'B', acuity: 'Critical', diagnosis: 'Asthma Exacerbation' },
  { id: 'P005', mrn: 'MRN-2024-005', first_name: 'Ava', last_name: 'Davis', date_of_birth: '2017-01-30', age: 7, gender: 'Female', room: '103', bed: 'A', acuity: 'Low', diagnosis: 'Fever of Unknown Origin' },
  { id: 'P006', mrn: 'MRN-2024-006', first_name: 'James', last_name: 'Miller', date_of_birth: '2015-09-12', age: 9, gender: 'Male', room: '103', bed: 'B', acuity: 'Medium', diagnosis: 'Gastroenteritis' },
  { id: 'P007', mrn: 'MRN-2024-007', first_name: 'Sophia', last_name: 'Wilson', date_of_birth: '2021-04-25', age: 3, gender: 'Female', room: '104', bed: 'A', acuity: 'High', diagnosis: 'Pneumonia' },
  { id: 'P008', mrn: 'MRN-2024-008', first_name: 'Benjamin', last_name: 'Moore', date_of_birth: '2014-12-03', age: 10, gender: 'Male', room: '104', bed: 'B', acuity: 'Low', diagnosis: 'Tonsillitis' },
];

const MOCK_DOCTOR_NOTES: DoctorNote[] = [
  {
    id: 'DN001', patientId: 'P001', doctorName: 'Dr. Amanda Foster', dateTime: '2024-04-07 08:30',
    planOfCare: 'Continue antibiotics therapy. Monitor respiratory status closely. Consider chest X-ray if no improvement in 48 hours.',
    recommendations: ['Albuterol nebulizer Q4H PRN', 'Increase fluid intake', 'Elevate head of bed 30 degrees'],
    monitoring: ['SpO2 every 2 hours', 'Respiratory rate Q4H', 'Temperature Q4H', 'Breath sounds assessment each shift'],
    status: 'active', priority: 'routine'
  },
  {
    id: 'DN002', patientId: 'P002', doctorName: 'Dr. Robert Kim', dateTime: '2024-04-07 09:15',
    planOfCare: 'Post-reduction care for left forearm fracture. Pain management and neurovascular checks.',
    recommendations: ['Acetaminophen 15mg/kg Q6H for pain', 'Ice pack 20 min on/off', 'Keep arm elevated'],
    monitoring: ['Pain level Q4H using FACES scale', 'Capillary refill and sensation in fingers Q2H', 'Cast integrity check'],
    status: 'active', priority: 'routine'
  },
  {
    id: 'DN003', patientId: 'P003', doctorName: 'Dr. Patricia Nguyen', dateTime: '2024-04-07 07:00',
    planOfCare: 'Pre-operative preparation for appendectomy scheduled for 14:00 today. NPO status confirmed.',
    recommendations: ['NPO strictly enforced', 'IV fluids at maintenance rate', 'Pre-op checklist completion', 'Consent verified'],
    monitoring: ['Vital signs Q2H', 'Pain assessment Q2H', 'Signs of perforation (increased pain, fever, rigidity)'],
    status: 'active', priority: 'urgent'
  },
  {
    id: 'DN004', patientId: 'P004', doctorName: 'Dr. Amanda Foster', dateTime: '2024-04-07 06:45',
    planOfCare: 'Severe asthma exacerbation. Continuous monitoring required. Consider ICU transfer if no improvement.',
    recommendations: ['Continuous albuterol nebulizer', 'Methylprednisolone 2mg/kg IV Q6H', 'Magnesium sulfate if needed', 'Oxygen to maintain SpO2 >94%'],
    monitoring: ['Continuous SpO2 monitoring', 'Peak flow Q2H when able', 'Respiratory assessment Q1H', 'ABG if worsening'],
    status: 'active', priority: 'stat'
  },
  {
    id: 'DN005', patientId: 'P005', doctorName: 'Dr. Michael Torres', dateTime: '2024-04-07 10:00',
    planOfCare: 'Workup for fever of unknown origin. Cultures pending. Supportive care while awaiting results.',
    recommendations: ['Acetaminophen PRN for fever >101°F', 'Encourage oral fluids', 'Blood cultures x2 drawn'],
    monitoring: ['Temperature Q4H', 'I&O monitoring', 'Watch for new symptoms or rash'],
    status: 'active', priority: 'routine'
  },
  {
    id: 'DN006', patientId: 'P006', doctorName: 'Dr. Michael Torres', dateTime: '2024-04-07 08:00',
    planOfCare: 'Acute gastroenteritis with moderate dehydration. IV rehydration followed by oral challenge.',
    recommendations: ['IV NS bolus 20mL/kg, then maintenance', 'Ondansetron 0.15mg/kg PRN nausea', 'Clear liquids when tolerating'],
    monitoring: ['Strict I&O', 'Daily weights', 'Electrolytes in AM', 'Signs of dehydration'],
    status: 'active', priority: 'routine'
  },
  {
    id: 'DN007', patientId: 'P007', doctorName: 'Dr. Patricia Nguyen', dateTime: '2024-04-07 07:30',
    planOfCare: 'Community-acquired pneumonia. IV antibiotics started. Respiratory support as needed.',
    recommendations: ['Ceftriaxone 50mg/kg IV daily', 'Azithromycin 10mg/kg PO day 1', 'Supplemental O2 to maintain SpO2 >92%'],
    monitoring: ['SpO2 continuous', 'Respiratory rate and work of breathing Q2H', 'Daily chest X-ray', 'Temperature Q4H'],
    status: 'active', priority: 'urgent'
  },
  {
    id: 'DN008', patientId: 'P008', doctorName: 'Dr. Robert Kim', dateTime: '2024-04-07 09:30',
    planOfCare: 'Acute tonsillitis. Antibiotics started. Assess for peritonsillar abscess. Likely discharge tomorrow if improving.',
    recommendations: ['Amoxicillin 25mg/kg TID', 'Ibuprofen alternating with acetaminophen for pain', 'Soft diet, cool fluids'],
    monitoring: ['Ability to swallow', 'Hydration status', 'Fever curve', 'Throat examination'],
    status: 'active', priority: 'routine'
  },
];

const NURSE_TOOLS = [
  { id: 'vitals', icon: '❤️', title: 'Vital Signs', desc: 'Evaluate pediatric vitals', color: 'from-rose-500 to-pink-600' },
  { id: 'iv-calc', icon: '💉', title: 'IV Calculator', desc: 'Drip rates & infusion times', color: 'from-blue-500 to-cyan-600' },
  { id: 'med-admin', icon: '💊', title: 'Med Check', desc: 'Verify doses & interactions', color: 'from-purple-500 to-indigo-600' },
  { id: 'handoff', icon: '📋', title: 'Shift Handoff', desc: 'Generate SBAR report', color: 'from-amber-500 to-orange-600' },
  { id: 'blood', icon: '🩸', title: 'Blood Check', desc: 'Transfusion protocols', color: 'from-red-500 to-rose-600' },
  { id: 'pain', icon: '📊', title: 'Pain Scale', desc: 'FLACC, Wong-Baker', color: 'from-teal-500 to-emerald-600' },
];

const ACUITY_COLORS = {
  Low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  Medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  High: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  Critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const STATUS_COLORS = {
  available: { bg: 'bg-green-500', text: 'Available' },
  busy: { bg: 'bg-yellow-500', text: 'Busy' },
  break: { bg: 'bg-gray-500', text: 'On Break' },
};

/* ─── Main Page ──────────────────────────────────────────────── */

export default function NurseStationPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [nurses] = useState<Nurse[]>(MOCK_NURSES);
  const [doctorNotes] = useState<DoctorNote[]>(MOCK_DOCTOR_NOTES);
  const [nurseNotes, setNurseNotes] = useState<NurseNote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [selectedNurse, setSelectedNurse] = useState<string | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  // Nurse note modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notePatientId, setNotePatientId] = useState<string | null>(null);
  const [noteCategory, setNoteCategory] = useState<NurseNote['category']>('other');
  const [noteUrgency, setNoteUrgency] = useState<NurseNote['urgency']>('routine');
  const [noteText, setNoteText] = useState('');

  // Tool states
  const [toolPatientId, setToolPatientId] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respRate, setRespRate] = useState('');
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [o2Sat, setO2Sat] = useState('');
  const [totalVolume, setTotalVolume] = useState('');
  const [infusionHours, setInfusionHours] = useState('');
  const [dropFactor, setDropFactor] = useState('60');
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [patientWeight, setPatientWeight] = useState('');
  
  // Shift Handoff states
  const [handoffStatus, setHandoffStatus] = useState('');
  const [handoffEvents, setHandoffEvents] = useState('');
  const [handoffPlan, setHandoffPlan] = useState('');
  const [handoffConcerns, setHandoffConcerns] = useState('');
  
  // Pain Scale states
  const [painScore, setPainScore] = useState('');
  const [painLocation, setPainLocation] = useState('');
  const [painType, setPainType] = useState('');
  const [painIntervention, setPainIntervention] = useState('');
  
  // Blood Check states
  const [bloodType, setBloodType] = useState('');
  const [bloodUnits, setBloodUnits] = useState('');
  const [bloodReason, setBloodReason] = useState('');

  // Get the selected tool patient
  const toolPatient = toolPatientId ? patients.find(p => p.id === toolPatientId) : null;

  // Auto-fill patient age when tool patient is selected
  useEffect(() => {
    if (toolPatient) {
      setPatientAge(toolPatient.age.toString());
    }
  }, [toolPatientId]);

  useEffect(() => {
    loadAssignments();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/ehr/patients');
      if (res.ok) {
        const data = await res.json();
        const patientsWithDetails = data.map((p: Patient, idx: number) => ({
          ...p,
          room: `${100 + Math.floor(idx / 2)}`,
          bed: idx % 2 === 0 ? 'A' : 'B',
          acuity: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)] as Patient['acuity'],
          diagnosis: ['Respiratory Infection', 'Fracture', 'Appendicitis', 'Asthma Exacerbation', 'Fever'][Math.floor(Math.random() * 5)],
        }));
        setPatients(patientsWithDetails);
      }
    } catch {
      // Use mock data on error
    }
  };

  const loadAssignments = () => {
    const saved = localStorage.getItem('nurseAssignments');
    if (saved) setAssignments(JSON.parse(saved));
  };

  const saveAssignments = (newAssignments: Assignment[]) => {
    localStorage.setItem('nurseAssignments', JSON.stringify(newAssignments));
    setAssignments(newAssignments);
  };

  const getAssignedNurse = (patientId: string): Nurse | undefined => {
    const assignment = assignments.find(a => a.patientIds.includes(patientId));
    return assignment ? nurses.find(n => n.id === assignment.nurseId) : undefined;
  };

  const getNursePatients = (nurseId: string): Patient[] => {
    const assignment = assignments.find(a => a.nurseId === nurseId);
    return assignment ? patients.filter(p => assignment.patientIds.includes(p.id)) : [];
  };

  const getPatientDoctorNote = (patientId: string): DoctorNote | undefined => {
    return doctorNotes.find(n => n.patientId === patientId && n.status === 'active');
  };

  const toggleNoteExpanded = (patientId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedNotes(newExpanded);
  };

  const getPriorityStyle = (priority: DoctorNote['priority']) => {
    switch (priority) {
      case 'stat': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '🚨 STAT' };
      case 'urgent': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '⚠️ Urgent' };
      default: return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: '📋 Routine' };
    }
  };

  const getPatientNurseNotes = (patientId: string): NurseNote[] => {
    return nurseNotes.filter(n => n.patientId === patientId);
  };

  const openNoteModal = (patientId: string) => {
    setNotePatientId(patientId);
    setNoteCategory('other');
    setNoteUrgency('routine');
    setNoteText('');
    setShowNoteModal(true);
  };

  const submitNurseNote = () => {
    if (!notePatientId || !noteText.trim() || !selectedNurse) return;
    const nurse = nurses.find(n => n.id === selectedNurse);
    const newNote: NurseNote = {
      id: `NN${Date.now()}`,
      patientId: notePatientId,
      nurseName: nurse?.name || 'Unknown Nurse',
      nurseId: selectedNurse,
      dateTime: new Date().toLocaleString(),
      category: noteCategory,
      urgency: noteUrgency,
      note: noteText.trim(),
      status: 'pending',
    };
    setNurseNotes([newNote, ...nurseNotes]);
    // Save to localStorage for persistence
    const saved = JSON.parse(localStorage.getItem('nurseNotes') || '[]');
    localStorage.setItem('nurseNotes', JSON.stringify([newNote, ...saved]));
    setShowNoteModal(false);
    setNoteText('');
  };

  const getNoteUrgencyStyle = (urgency: NurseNote['urgency']) => {
    switch (urgency) {
      case 'critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '🚨 Critical' };
      case 'urgent': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '⚠️ Urgent' };
      default: return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: '📝 Routine' };
    }
  };

  const NOTE_CATEGORIES = [
    { id: 'vitals_concern', label: '💓 Vitals Concern', desc: 'Abnormal vital signs' },
    { id: 'medication_issue', label: '💊 Medication Issue', desc: 'Med-related concerns' },
    { id: 'behavior_change', label: '🧠 Behavior Change', desc: 'Mental status changes' },
    { id: 'pain', label: '😣 Pain', desc: 'Pain management needs' },
    { id: 'family_request', label: '👨‍👩‍👧 Family Request', desc: 'Family concerns/requests' },
    { id: 'other', label: '📋 Other', desc: 'General observations' },
  ];

  // Load nurse notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nurseNotes');
    if (saved) setNurseNotes(JSON.parse(saved));
  }, []);

  const assignPatients = () => {
    if (!selectedNurse || selectedPatients.size === 0) return;
    const newAssignments = [...assignments];
    newAssignments.forEach(a => { a.patientIds = a.patientIds.filter(id => !selectedPatients.has(id)); });
    let nurseAssignment = newAssignments.find(a => a.nurseId === selectedNurse);
    if (!nurseAssignment) {
      nurseAssignment = { nurseId: selectedNurse, patientIds: [] };
      newAssignments.push(nurseAssignment);
    }
    selectedPatients.forEach(id => {
      if (!nurseAssignment!.patientIds.includes(id)) nurseAssignment!.patientIds.push(id);
    });
    saveAssignments(newAssignments.filter(a => a.patientIds.length > 0));
    setSelectedPatients(new Set());
    setSelectedNurse(null);
  };

  const unassignPatient = (patientId: string) => {
    const newAssignments = assignments.map(a => ({
      ...a, patientIds: a.patientIds.filter(id => id !== patientId),
    })).filter(a => a.patientIds.length > 0);
    saveAssignments(newAssignments);
  };

  const togglePatientSelection = (patientId: string) => {
    const newSelection = new Set(selectedPatients);
    if (newSelection.has(patientId)) newSelection.delete(patientId);
    else newSelection.add(patientId);
    setSelectedPatients(newSelection);
  };

  const filteredPatients = patients.filter(p =>
    p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const units = [...new Set(nurses.map(n => n.unit))];

  // Tool handlers
  const handleVitalsAssess = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Assess pediatric vital signs for ${patientAge}yo: HR ${heartRate}, RR ${respRate}, Temp ${temp}°F, BP ${bp}, O2 ${o2Sat}%. Provide interpretation and recommendations.`,
          session_id: 'nurse_vitals',
        }),
      });
      setResult(await res.text());
    } catch { setResult('Error assessing vitals.'); }
    setLoading(false);
  };

  const handleIVCalc = () => {
    const vol = parseFloat(totalVolume), hrs = parseFloat(infusionHours), factor = parseFloat(dropFactor);
    if (vol && hrs && factor) {
      setResult(`**IV Calculation**\n\n- Rate: **${(vol/hrs).toFixed(1)} mL/hr**\n- Drops: **${((vol*factor)/(hrs*60)).toFixed(1)} gtt/min**\n\nVolume: ${vol}mL | Duration: ${hrs}hr | Factor: ${factor} gtt/mL`);
    }
  };

  const handleMedCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Medication check: ${medName} ${medDose} for ${patientWeight}kg patient. Verify pediatric dose and provide guidance.`,
          session_id: 'nurse_med',
        }),
      });
      setResult(await res.text());
    } catch { setResult('Error checking medication.'); }
    setLoading(false);
  };

  const handleShiftHandoff = async () => {
    if (!toolPatient) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Generate SBAR shift handoff report for pediatric patient:
Patient: ${toolPatient.first_name} ${toolPatient.last_name}, ${toolPatient.age}yo, Room ${toolPatient.room}-${toolPatient.bed}
Diagnosis: ${toolPatient.diagnosis}
Current Status: ${handoffStatus || 'Stable'}
Key Events This Shift: ${handoffEvents || 'None'}
Care Plan: ${handoffPlan || 'Continue current care'}
Concerns/Watchouts: ${handoffConcerns || 'None'}

Format as a professional SBAR nursing handoff report.`,
          session_id: 'nurse_handoff',
        }),
      });
      setResult(await res.text());
    } catch { setResult('Error generating handoff report.'); }
    setLoading(false);
  };

  const handlePainAssessment = () => {
    if (!toolPatient) return;
    const score = parseInt(painScore) || 0;
    let interpretation = '';
    let recommendation = '';
    
    if (toolPatient.age <= 3) {
      interpretation = `FLACC Scale Score: ${score}/10`;
      if (score <= 3) recommendation = 'Mild discomfort - Non-pharmacological interventions, comfort measures';
      else if (score <= 6) recommendation = 'Moderate pain - Consider analgesics per protocol, notify provider';
      else recommendation = '⚠️ Severe pain - Immediate intervention needed, notify provider STAT';
    } else if (toolPatient.age <= 7) {
      interpretation = `Wong-Baker FACES Score: ${score}/10`;
      if (score <= 2) recommendation = 'No/minimal pain - Continue monitoring';
      else if (score <= 4) recommendation = 'Mild pain - Distraction, positioning, comfort measures';
      else if (score <= 6) recommendation = 'Moderate pain - Analgesic intervention recommended';
      else recommendation = '⚠️ Severe pain - Immediate pain management needed';
    } else {
      interpretation = `Numeric Pain Scale: ${score}/10`;
      if (score <= 3) recommendation = 'Mild pain - PRN medications as needed';
      else if (score <= 6) recommendation = 'Moderate pain - Scheduled analgesics recommended';
      else recommendation = '⚠️ Severe pain - Escalate to provider, consider PCA/stronger analgesics';
    }

    setResult(`**Pain Assessment - ${toolPatient.first_name} ${toolPatient.last_name}**
    
📊 ${interpretation}
📍 Location: ${painLocation || 'Not specified'}
🔍 Type: ${painType || 'Not specified'}

**Recommendation:**
${recommendation}

**Intervention Given:** ${painIntervention || 'None documented'}

**Scale Used:** ${toolPatient.age <= 3 ? 'FLACC (Face, Legs, Activity, Cry, Consolability)' : toolPatient.age <= 7 ? 'Wong-Baker FACES' : 'Numeric Rating Scale (0-10)'}

⏰ Reassess in ${score > 6 ? '15-30 minutes' : score > 3 ? '1 hour' : '4 hours'}`);
  };

  const handleBloodCheck = () => {
    if (!toolPatient) return;
    const transfusionChecklist = `**Blood Transfusion Safety Check**
Patient: ${toolPatient.first_name} ${toolPatient.last_name} | MRN: ${toolPatient.mrn}
Room: ${toolPatient.room}-${toolPatient.bed}

📋 **Product:** ${bloodType || 'Not specified'} x ${bloodUnits || '1'} unit(s)
📝 **Indication:** ${bloodReason || 'Not specified'}

✅ **Pre-Transfusion Checklist:**
□ Verify physician order
□ Obtain informed consent
□ Check patient ID (2 identifiers)
□ Verify blood product matches order
□ Check expiration date
□ Inspect bag for abnormalities
□ Confirm ABO/Rh compatibility
□ Two-nurse verification completed
□ Baseline vitals recorded

⚠️ **Vital Sign Monitoring Schedule:**
• Baseline: Before starting
• 15 min: After initiation
• 30 min: Continue monitoring
• Then: Every hour until complete
• Post: 1 hour after completion

🚨 **Watch for Transfusion Reactions:**
• Fever (>1°C rise), chills, rigors
• Urticaria, itching, flushing
• Dyspnea, wheezing
• Hypotension or hypertension
• Back/flank pain
• Hemoglobinuria

**If reaction suspected: STOP transfusion immediately, maintain IV access, notify provider STAT**`;

    setResult(transfusionChecklist);
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'vitals':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Age (years)', value: patientAge, set: setPatientAge, ph: '5' },
                { label: 'Heart Rate', value: heartRate, set: setHeartRate, ph: '100' },
                { label: 'Resp Rate', value: respRate, set: setRespRate, ph: '20' },
                { label: 'Temp (°F)', value: temp, set: setTemp, ph: '98.6' },
                { label: 'Blood Pressure', value: bp, set: setBp, ph: '100/60' },
                { label: 'O2 Sat (%)', value: o2Sat, set: setO2Sat, ph: '98' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                  <input type="text" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
                </div>
              ))}
            </div>
            <button onClick={handleVitalsAssess} disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50">
              {loading ? 'Assessing...' : 'Assess Vitals'}
            </button>
          </div>
        );
      case 'iv-calc':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-white/50 mb-1">Volume (mL)</label>
                <input type="number" value={totalVolume} onChange={e => setTotalVolume(e.target.value)} placeholder="1000"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Hours</label>
                <input type="number" value={infusionHours} onChange={e => setInfusionHours(e.target.value)} placeholder="8"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Drop Factor</label>
                <select value={dropFactor} onChange={e => setDropFactor(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                  <option value="10">10 gtt/mL</option>
                  <option value="15">15 gtt/mL</option>
                  <option value="20">20 gtt/mL</option>
                  <option value="60">60 gtt/mL (peds)</option>
                </select>
              </div>
            </div>
            <button onClick={handleIVCalc}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold text-sm">
              Calculate IV Rate
            </button>
          </div>
        );
      case 'med-admin':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-white/50 mb-1">Medication</label>
                <input type="text" value={medName} onChange={e => setMedName(e.target.value)} placeholder="Amoxicillin"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Dose</label>
                <input type="text" value={medDose} onChange={e => setMedDose(e.target.value)} placeholder="250mg"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Weight (kg)</label>
                <input type="number" value={patientWeight} onChange={e => setPatientWeight(e.target.value)} placeholder="20"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleMedCheck} disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50">
              {loading ? 'Checking...' : 'Check Medication'}
            </button>
          </div>
        );
      case 'handoff':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Current Status</label>
              <select value={handoffStatus} onChange={e => setHandoffStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                <option value="">Select status...</option>
                <option value="Stable">Stable</option>
                <option value="Improving">Improving</option>
                <option value="Guarded">Guarded</option>
                <option value="Critical">Critical</option>
                <option value="Declining">Declining</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Key Events This Shift</label>
              <textarea value={handoffEvents} onChange={e => setHandoffEvents(e.target.value)} 
                placeholder="Procedures, tests, changes in condition..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Care Plan / Next Steps</label>
              <textarea value={handoffPlan} onChange={e => setHandoffPlan(e.target.value)} 
                placeholder="Upcoming meds, tests, discharge planning..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Concerns / Watch For</label>
              <textarea value={handoffConcerns} onChange={e => setHandoffConcerns(e.target.value)} 
                placeholder="Pain, fall risk, family concerns..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none resize-none" rows={2} />
            </div>
            <button onClick={handleShiftHandoff} disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate SBAR Report'}
            </button>
          </div>
        );
      case 'blood':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Blood Product Type</label>
              <select value={bloodType} onChange={e => setBloodType(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                <option value="">Select product...</option>
                <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
                <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
                <option value="Platelets">Platelets</option>
                <option value="Cryoprecipitate">Cryoprecipitate</option>
                <option value="Whole Blood">Whole Blood</option>
                <option value="Albumin">Albumin</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/50 mb-1">Units</label>
                <input type="number" value={bloodUnits} onChange={e => setBloodUnits(e.target.value)} placeholder="1"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Indication</label>
                <select value={bloodReason} onChange={e => setBloodReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                  <option value="">Select reason...</option>
                  <option value="Anemia">Anemia</option>
                  <option value="Active Bleeding">Active Bleeding</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Coagulopathy">Coagulopathy</option>
                  <option value="Thrombocytopenia">Thrombocytopenia</option>
                </select>
              </div>
            </div>
            <button onClick={handleBloodCheck}
              className="w-full py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold text-sm">
              Generate Transfusion Checklist
            </button>
          </div>
        );
      case 'pain':
        return (
          <div className="space-y-3">
            {toolPatient && (
              <div className="p-2 rounded-lg bg-white/5 text-xs text-white/60">
                Scale: {toolPatient.age <= 3 ? 'FLACC (0-10)' : toolPatient.age <= 7 ? 'Wong-Baker FACES (0-10)' : 'Numeric (0-10)'}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/50 mb-1">Pain Score (0-10)</label>
                <input type="number" min="0" max="10" value={painScore} onChange={e => setPainScore(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Location</label>
                <input type="text" value={painLocation} onChange={e => setPainLocation(e.target.value)} placeholder="Abdomen, leg..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/50 mb-1">Pain Type</label>
                <select value={painType} onChange={e => setPainType(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                  <option value="">Select type...</option>
                  <option value="Sharp">Sharp</option>
                  <option value="Dull">Dull</option>
                  <option value="Burning">Burning</option>
                  <option value="Aching">Aching</option>
                  <option value="Throbbing">Throbbing</option>
                  <option value="Cramping">Cramping</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Intervention Given</label>
                <select value={painIntervention} onChange={e => setPainIntervention(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none">
                  <option value="">None</option>
                  <option value="Acetaminophen">Acetaminophen</option>
                  <option value="Ibuprofen">Ibuprofen</option>
                  <option value="Morphine">Morphine</option>
                  <option value="Distraction">Distraction</option>
                  <option value="Repositioning">Repositioning</option>
                  <option value="Ice/Heat">Ice/Heat</option>
                </select>
              </div>
            </div>
            <button onClick={handlePainAssessment}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold text-sm">
              Assess Pain
            </button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-32 text-white/40 text-sm">
            Select a tool above
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0D1117' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-4" style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Nurse Station</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Patient assignments & clinical tools</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab Switcher */}
            <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {[
                { id: 'dashboard', label: '📋 Assign' },
                { id: 'my-patients', label: '� My Patients' },
                { id: 'tools', label: '🔧 Tools' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'bg-teal-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(0,196,213,0.15)', color: '#00C4D5' }}>
              {patients.length} Patients • {nurses.length} Nurses
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Patients</p>
            <p className="text-2xl font-bold text-white">{patients.length}</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Unassigned</p>
            <p className="text-2xl font-bold text-orange-400">{patients.filter(p => !getAssignedNurse(p.id)).length}</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Nurses Available</p>
            <p className="text-2xl font-bold text-green-400">{nurses.filter(n => n.status === 'available').length}</p>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Critical Patients</p>
            <p className="text-2xl font-bold text-red-400">{patients.filter(p => p.acuity === 'Critical').length}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              {/* Step Navigation Bar */}
              <div className="mb-6 rounded-2xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Step 1 */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${!selectedNurse ? 'bg-teal-500 text-white' : 'bg-white/5 text-white/60'}`}>
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                      <span className="text-sm font-medium">Select Nurse</span>
                    </div>
                    <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {/* Step 2 */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${selectedNurse && selectedPatients.size === 0 ? 'bg-teal-500 text-white' : selectedNurse ? 'bg-white/5 text-white/60' : 'bg-white/5 text-white/30'}`}>
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                      <span className="text-sm font-medium">Select Patients</span>
                    </div>
                    <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {/* Step 3 */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${selectedPatients.size > 0 ? 'bg-teal-500 text-white' : 'bg-white/5 text-white/30'}`}>
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
                      <span className="text-sm font-medium">Confirm</span>
                    </div>
                  </div>
                  
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    {selectedNurse && (
                      <button onClick={() => { setSelectedNurse(null); setSelectedPatients(new Set()); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Nurses
                      </button>
                    )}
                    {selectedPatients.size > 0 && selectedNurse && (
                      <button onClick={assignPatients}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #00C4D5 0%, #0891B2 100%)' }}>
                        Assign {selectedPatients.size} Patient{selectedPatients.size > 1 ? 's' : ''}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Current Selection Info */}
                {selectedNurse && (
                  <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                        {nurses.find(n => n.id === selectedNurse)?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{nurses.find(n => n.id === selectedNurse)?.name}</p>
                        <p className="text-xs text-white/50">{nurses.find(n => n.id === selectedNurse)?.unit} • {getNursePatients(selectedNurse).length} current patients</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#00C4D5' }}>{selectedPatients.size}</p>
                      <p className="text-xs text-white/50">patients selected</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Nurse Selection Grid (when no nurse selected) */}
              {!selectedNurse && (
                <div className="rounded-2xl p-5" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Select a Nurse to Assign Patients</h2>
                    <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none">
                      <option value="all">All Units</option>
                      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nurses.filter(n => filterUnit === 'all' || n.unit === filterUnit).map(nurse => {
                      const nursePatients = getNursePatients(nurse.id);
                      return (
                        <motion.button key={nurse.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedNurse(nurse.id)}
                          className="p-4 rounded-xl text-left transition-all hover:ring-2 hover:ring-teal-500/50"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                              {nurse.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{nurse.name}</p>
                                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[nurse.status].bg}`} />
                              </div>
                              <p className="text-xs mt-0.5 text-white/40">{nurse.unit}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                                  {nursePatients.length}/{nurse.maxPatients} patients
                                </span>
                                <span className="text-xs text-white/40">{nurse.shift} Shift</span>
                              </div>
                            </div>
                          </div>
                          {nursePatients.length > 0 && (
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-xs text-white/50 mb-1">Current patients:</p>
                              <div className="flex flex-wrap gap-1">
                                {nursePatients.slice(0, 3).map(p => (
                                  <span key={p.id} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60">
                                    {p.room}{p.bed}
                                  </span>
                                ))}
                                {nursePatients.length > 3 && <span className="text-xs text-white/40">+{nursePatients.length - 3} more</span>}
                              </div>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Patient Selection (when nurse is selected) */}
              {selectedNurse && (
                <div className="rounded-2xl p-5" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Select Patients to Assign</h2>
                    <div className="flex items-center gap-3">
                      <input type="text" placeholder="Search patients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-teal-500 w-64" />
                      <button onClick={() => setSelectedPatients(selectedPatients.size === filteredPatients.length ? new Set() : new Set(filteredPatients.map(p => p.id)))}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {selectedPatients.size === filteredPatients.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <th className="pb-3 pl-2 w-12">
                            <input type="checkbox"
                              checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
                              onChange={() => setSelectedPatients(selectedPatients.size === filteredPatients.length ? new Set() : new Set(filteredPatients.map(p => p.id)))}
                              className="w-4 h-4 rounded" />
                          </th>
                          <th className="pb-3">Room</th>
                          <th className="pb-3">Patient</th>
                          <th className="pb-3">Age</th>
                          <th className="pb-3">Diagnosis</th>
                          <th className="pb-3">Acuity</th>
                          <th className="pb-3">Current Assignment</th>
                          <th className="pb-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.map((patient) => {
                          const assignedNurse = getAssignedNurse(patient.id);
                          const isSelected = selectedPatients.has(patient.id);
                          const acuityStyle = ACUITY_COLORS[patient.acuity || 'Low'];
                          return (
                            <tr key={patient.id} 
                              onClick={() => togglePatientSelection(patient.id)}
                              className={`border-t border-white/5 cursor-pointer transition-all ${isSelected ? 'bg-teal-500/15' : 'hover:bg-white/5'}`}>
                              <td className="py-3 pl-2">
                                <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded pointer-events-none" />
                              </td>
                              <td className="py-3"><span className="text-sm font-mono font-semibold text-white">{patient.room}{patient.bed}</span></td>
                              <td className="py-3">
                                <p className="text-sm font-semibold text-white">{patient.first_name} {patient.last_name}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>MRN: {patient.mrn}</p>
                              </td>
                              <td className="py-3 text-sm text-white">{patient.age}y</td>
                              <td className="py-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{patient.diagnosis}</td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${acuityStyle.bg} ${acuityStyle.text} ${acuityStyle.border} border`}>{patient.acuity}</span>
                              </td>
                              <td className="py-3">
                                {assignedNurse ? (
                                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,196,213,0.15)', color: '#00C4D5' }}>{assignedNurse.name.split(',')[0]}</span>
                                ) : (
                                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,165,0,0.15)', color: '#FFA500' }}>Unassigned</span>
                                )}
                              </td>
                              <td className="py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <Link href={`/ehr/${patient.id}`} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10" style={{ color: '#00C4D5' }}>View EHR</Link>
                                  {assignedNurse && <button onClick={() => unassignPatient(patient.id)} className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/20 text-red-400">Unassign</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'my-patients' ? (
            <motion.div key="my-patients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Nurse Selector for My Patients View */}
              <div className="mb-6 rounded-2xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">View Nurse's Patients</h2>
                  <select 
                    value={selectedNurse || ''}
                    onChange={(e) => setSelectedNurse(e.target.value || null)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select a Nurse</option>
                    {nurses.map(nurse => (
                      <option key={nurse.id} value={nurse.id}>{nurse.name} ({getNursePatients(nurse.id).length} patients)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Nurse's Patient List */}
              {selectedNurse ? (
                <div className="rounded-2xl p-5" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                      {nurses.find(n => n.id === selectedNurse)?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{nurses.find(n => n.id === selectedNurse)?.name}</h3>
                      <p className="text-sm text-white/50">{nurses.find(n => n.id === selectedNurse)?.unit} • {nurses.find(n => n.id === selectedNurse)?.shift} Shift</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold" style={{ color: '#00C4D5' }}>{getNursePatients(selectedNurse).length}</p>
                      <p className="text-xs text-white/50">assigned patients</p>
                    </div>
                  </div>

                  {getNursePatients(selectedNurse).length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {getNursePatients(selectedNurse).map(patient => {
                        const acuityStyle = ACUITY_COLORS[patient.acuity || 'Low'];
                        const doctorNote = getPatientDoctorNote(patient.id);
                        const isExpanded = expandedNotes.has(patient.id);
                        const priorityStyle = doctorNote ? getPriorityStyle(doctorNote.priority) : null;
                        return (
                          <div key={patient.id} className="rounded-xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Patient Header */}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                                    {patient.room}{patient.bed}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">{patient.first_name} {patient.last_name}</p>
                                    <p className="text-xs text-white/40">MRN: {patient.mrn} • {patient.age}y {patient.gender}</p>
                                    <p className="text-xs text-white/60 mt-0.5">{patient.diagnosis}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-xs px-2 py-1 rounded-full ${acuityStyle.bg} ${acuityStyle.text} ${acuityStyle.border} border`}>
                                    {patient.acuity}
                                  </span>
                                  {priorityStyle && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                                      {priorityStyle.label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Doctor's Note Preview/Toggle */}
                              {doctorNote && (
                                <button onClick={() => toggleNoteExpanded(patient.id)}
                                  className="w-full mt-2 p-3 rounded-lg text-left transition-all hover:bg-white/5"
                                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-400">📝</span>
                                      <span className="text-xs font-semibold text-purple-300">Doctor's Orders</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-white/40">{doctorNote.doctorName}</span>
                                      <svg className={`w-4 h-4 text-purple-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                  <p className="text-xs text-white/60 line-clamp-2">{doctorNote.planOfCare}</p>
                                </button>
                              )}
                            </div>

                            {/* Expanded Doctor's Note */}
                            <AnimatePresence>
                              {isExpanded && doctorNote && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(139,92,246,0.2)' }}>
                                    {/* Plan of Care */}
                                    <div className="pt-3">
                                      <p className="text-xs font-semibold text-purple-300 mb-1">📋 Plan of Care</p>
                                      <p className="text-sm text-white/80">{doctorNote.planOfCare}</p>
                                    </div>

                                    {/* Recommendations */}
                                    <div>
                                      <p className="text-xs font-semibold text-green-400 mb-1">✅ Recommendations</p>
                                      <ul className="space-y-1">
                                        {doctorNote.recommendations.map((rec, i) => (
                                          <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                            <span className="text-green-500 mt-0.5">•</span>
                                            {rec}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Monitoring */}
                                    <div>
                                      <p className="text-xs font-semibold text-amber-400 mb-1">👁️ Monitoring</p>
                                      <ul className="space-y-1">
                                        {doctorNote.monitoring.map((mon, i) => (
                                          <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            {mon}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Note Footer */}
                                    <div className="pt-2 flex items-center justify-between text-xs text-white/40" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                      <span>Last updated: {doctorNote.dateTime}</span>
                                      <span className="text-purple-400">{doctorNote.doctorName}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Nurse Notes for Doctor */}
                            {getPatientNurseNotes(patient.id).length > 0 && (
                              <div className="px-4 pb-3">
                                <p className="text-xs font-semibold text-cyan-400 mb-2">📝 Your Notes for Doctor ({getPatientNurseNotes(patient.id).length})</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {getPatientNurseNotes(patient.id).slice(0, 2).map(note => {
                                    const urgStyle = getNoteUrgencyStyle(note.urgency);
                                    return (
                                      <div key={note.id} className="p-2 rounded-lg text-xs" style={{ background: 'rgba(0,196,213,0.08)', border: '1px solid rgba(0,196,213,0.2)' }}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${urgStyle.bg} ${urgStyle.text}`}>{urgStyle.label}</span>
                                          <span className="text-white/40 text-[10px]">{note.status}</span>
                                        </div>
                                        <p className="text-white/70 line-clamp-2">{note.note}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <Link href={`/ehr/${patient.id}`} 
                                className="flex-1 py-2 rounded-lg text-center text-xs font-medium transition-all hover:bg-teal-500/20"
                                style={{ background: 'rgba(0,196,213,0.1)', color: '#00C4D5' }}>
                                View EHR
                              </Link>
                              <button onClick={() => openNoteModal(patient.id)}
                                className="flex-1 py-2 rounded-lg text-center text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                                style={{ background: 'rgba(245,158,11,0.1)' }}>
                                📝 Note for Dr.
                              </button>
                              <button onClick={() => unassignPatient(patient.id)}
                                className="py-2 px-3 rounded-lg text-center text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                                style={{ background: 'rgba(239,68,68,0.1)' }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-white/50 mb-2">No patients assigned</p>
                      <button onClick={() => setActiveTab('dashboard')}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-teal-400 hover:bg-teal-500/10 transition-all">
                        Go to Assign Tab →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-12 text-center" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Select a Nurse</h3>
                  <p className="text-sm text-white/50 mb-4">Choose a nurse from the dropdown above to view their assigned patients</p>
                  
                  {/* Quick Nurse Buttons */}
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {nurses.map(nurse => (
                      <button key={nurse.id} onClick={() => setSelectedNurse(nurse.id)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all hover:ring-1 hover:ring-teal-500/50"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {nurse.name.split(',')[0]} ({getNursePatients(nurse.id).length})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Patient Selector for Tools */}
              <div className="mb-6 rounded-2xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm font-medium">Patient:</span>
                    <select
                      value={toolPatientId || ''}
                      onChange={(e) => setToolPatientId(e.target.value || null)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-teal-500 focus:outline-none min-w-[250px]"
                    >
                      <option value="">-- Select a patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} | Room {p.room}-{p.bed} | {p.age}yo {p.gender}
                        </option>
                      ))}
                    </select>
                  </div>
                  {toolPatient && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,196,213,0.1)' }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${toolPatient.gender === 'Female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                          {toolPatient.first_name[0]}{toolPatient.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{toolPatient.first_name} {toolPatient.last_name}</p>
                          <p className="text-xs text-white/50">MRN: {toolPatient.mrn} | {toolPatient.diagnosis}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">Room</p>
                        <p className="text-lg font-bold text-teal-400">{toolPatient.room}-{toolPatient.bed}</p>
                      </div>
                    </div>
                  )}
                </div>
                {!toolPatientId && (
                  <p className="mt-3 text-xs text-amber-400/80 flex items-center gap-2">
                    <span>⚠️</span> Please select a patient before using clinical tools
                  </p>
                )}
              </div>

              {/* Tool Cards Grid */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-4">Clinical Tools</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {NURSE_TOOLS.map(tool => (
                    <motion.button key={tool.id} whileHover={{ y: -2 }}
                      onClick={() => setActiveTool(tool.id as ActiveTool)}
                      className={`p-4 rounded-2xl text-left transition-all ${activeTool === tool.id ? 'ring-2 ring-teal-500' : ''}`}
                      style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3`}>
                        <span className="text-xl">{tool.icon}</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-0.5">{tool.title}</p>
                      <p className="text-xs text-white/40">{tool.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tool Content + Results */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white">{NURSE_TOOLS.find(t => t.id === activeTool)?.title || 'Select a Tool'}</h3>
                    {toolPatient && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-teal-500/20 text-teal-400">
                        For: {toolPatient.first_name} {toolPatient.last_name}
                      </span>
                    )}
                  </div>
                  {!toolPatientId && activeTool ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                        <span className="text-2xl">👤</span>
                      </div>
                      <p className="text-amber-400 text-sm font-medium mb-1">No Patient Selected</p>
                      <p className="text-white/40 text-xs">Select a patient above to use this tool</p>
                    </div>
                  ) : (
                    renderToolContent()
                  )}
                </div>
                <div className="rounded-2xl p-6" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white">Results</h3>
                    {result && toolPatient && (
                      <span className="text-xs text-white/40">
                        Patient: {toolPatient.first_name} {toolPatient.last_name} | Room {toolPatient.room}-{toolPatient.bed}
                      </span>
                    )}
                  </div>
                  {result ? (
                    <pre className="whitespace-pre-wrap text-sm text-white/80 font-sans bg-white/5 p-4 rounded-xl">{result}</pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-white/30">
                      <p className="text-sm">Results will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Reference */}
              <div className="mt-6">
                <h2 className="text-lg font-bold text-white mb-4">Quick Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 className="font-bold text-white mb-2">🧒 Pediatric Vital Signs</h4>
                    <table className="w-full text-xs text-white/70">
                      <thead><tr className="text-white/40"><th className="text-left py-1">Age</th><th>HR</th><th>RR</th><th>BP</th></tr></thead>
                      <tbody>
                        <tr><td>Newborn</td><td>120-160</td><td>30-60</td><td>60-90</td></tr>
                        <tr><td>Infant</td><td>100-150</td><td>25-40</td><td>80-100</td></tr>
                        <tr><td>Toddler</td><td>90-140</td><td>20-30</td><td>90-105</td></tr>
                        <tr><td>School</td><td>70-120</td><td>18-25</td><td>95-110</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 className="font-bold text-white mb-2">💉 Common IV Rates</h4>
                    <ul className="text-xs text-white/70 space-y-1">
                      <li>• <strong>Maintenance:</strong> 4-2-1 rule</li>
                      <li>• <strong>Bolus:</strong> 20 mL/kg over 20-60 min</li>
                      <li>• <strong>Blood:</strong> 10-15 mL/kg over 2-4 hr</li>
                      <li>• <strong>Micro drip:</strong> 60 gtt/mL for peds</li>
                    </ul>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 className="font-bold text-white mb-2">⚠️ Critical Values</h4>
                    <ul className="text-xs text-white/70 space-y-1">
                      <li>• <strong>K+:</strong> &lt;2.5 or &gt;6.5 mEq/L</li>
                      <li>• <strong>Glucose:</strong> &lt;40 or &gt;400 mg/dL</li>
                      <li>• <strong>Hgb:</strong> &lt;7 g/dL</li>
                      <li>• <strong>Platelets:</strong> &lt;50,000</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nurse Note Modal */}
        <AnimatePresence>
          {showNoteModal && notePatientId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowNoteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl overflow-hidden"
                style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <h3 className="text-lg font-bold text-white">📝 Note for Doctor</h3>
                    <p className="text-xs text-white/50">
                      Patient: {patients.find(p => p.id === notePatientId)?.first_name} {patients.find(p => p.id === notePatientId)?.last_name}
                    </p>
                  </div>
                  <button onClick={() => setShowNoteModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-4">
                  {/* Category Selection */}
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-2 block">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {NOTE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setNoteCategory(cat.id as NurseNote['category'])}
                          className={`p-2 rounded-lg text-xs text-left transition-all ${noteCategory === cat.id ? 'ring-2 ring-teal-500' : ''}`}
                          style={{ background: noteCategory === cat.id ? 'rgba(0,196,213,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <span className="block">{cat.label}</span>
                          <span className="text-[10px] text-white/40">{cat.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Urgency Selection */}
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-2 block">Urgency Level</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'routine', label: '📝 Routine', color: 'green' },
                        { id: 'urgent', label: '⚠️ Urgent', color: 'orange' },
                        { id: 'critical', label: '🚨 Critical', color: 'red' },
                      ].map(urg => (
                        <button
                          key={urg.id}
                          onClick={() => setNoteUrgency(urg.id as NurseNote['urgency'])}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${noteUrgency === urg.id ? `ring-2 ring-${urg.color}-500 bg-${urg.color}-500/20 text-${urg.color}-400` : 'text-white/60'}`}
                          style={{ background: noteUrgency === urg.id ? undefined : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {urg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note Text */}
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-2 block">Note Details</label>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Describe the issue or concern that needs doctor's attention..."
                      rows={4}
                      className="w-full p-3 rounded-xl text-sm outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => setShowNoteModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={submitNurseNote}
                    disabled={!noteText.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #00C4D5, #0891B2)', color: '#fff' }}
                  >
                    Submit Note
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
