'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────── */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'doctor' | 'patient';
  patient_id?: string;
}

/* ─── Simple markdown renderer ───────────────────────────────── */

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let numBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-0.5 my-2">
          {listBuffer.map((item, i) => <li key={i} className="text-sm text-gray-700 leading-relaxed">{inlineFormat(item)}</li>)}
        </ul>
      );
      listBuffer = [];
    }
    if (numBuffer.length) {
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-0.5 my-2">
          {numBuffer.map((item, i) => <li key={i} className="text-sm text-gray-700 leading-relaxed">{inlineFormat(item)}</li>)}
        </ol>
      );
      numBuffer = [];
    }
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const lvl = (line.match(/^(#{1,3})/)?.[1] || '#').length;
      const content = line.replace(/^#{1,3}\s/, '');
      const cls = lvl === 1 ? 'text-base font-bold text-gray-900 mt-3 mb-1'
        : lvl === 2 ? 'text-sm font-bold text-gray-800 mt-2 mb-0.5'
        : 'text-sm font-semibold text-gray-700 mt-1 mb-0.5';
      elements.push(<p key={key++} className={cls}>{content}</p>);
    } else if (/^[-*]\s/.test(line)) {
      numBuffer.length && flushList();
      listBuffer.push(line.replace(/^[-*]\s/, ''));
    } else if (/^\d+\.\s/.test(line)) {
      listBuffer.length && flushList();
      numBuffer.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={key++} className="my-2 border-gray-200" />);
    } else if (line.trim() === '') {
      flushList();
      elements.push(<div key={key++} className="h-1" />);
    } else {
      flushList();
      elements.push(<p key={key++} className="text-sm leading-relaxed text-gray-700">{inlineFormat(line)}</p>);
    }
  }
  flushList();
  return <>{elements}</>;
}

/* ─── Quick actions per role ─────────────────────────────────── */

const DOCTOR_QUICK_ACTIONS = [
  { icon: '🩺', text: 'Symptom assessment', query: 'Help me assess symptoms for a pediatric patient presenting with ' },
  { icon: '💊', text: 'Drug interactions', query: 'Check medication interactions for: ' },
  { icon: '📋', text: 'Draft SOAP note', query: 'Generate a SOAP note for a patient with the following presentation: ' },
  { icon: '🔬', text: 'Differential diagnosis', query: 'Top differential diagnoses for a child presenting with: ' },
  { icon: '📖', text: 'Clinical guidelines', query: 'Current clinical guidelines for managing ' },
  { icon: '🧪', text: 'Lab interpretation', query: 'Interpret these lab results for a pediatric patient: ' },
];

const PATIENT_QUICK_ACTIONS = [
  { icon: '❓', text: 'Explain my diagnosis', query: 'Can you explain my diagnosis in simple terms?' },
  { icon: '💊', text: 'Medication question', query: 'I have a question about my medication: ' },
  { icon: '📅', text: 'Prepare for appointment', query: 'Help me prepare questions for my upcoming doctor visit' },
  { icon: '🌡️', text: 'Symptom check', query: 'My child has the following symptoms: ' },
];

/* ─── Component ──────────────────────────────────────────────── */

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  const getSessionId = () => {
    if (user?.role === 'patient' && user?.patient_id) return `patient_${user.patient_id}`;
    return activeConversation || 'default';
  };

  const currentMessages = activeConversation
    ? conversations.find(c => c.id === activeConversation)?.messages || []
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const startNewConversation = useCallback(() => {
    const id = Date.now().toString();
    const conv: Conversation = { id, title: 'New Conversation', messages: [], lastUpdated: new Date() };
    setConversations(prev => [conv, ...prev]);
    setActiveConversation(id);
    return id;
  }, []);

  const sendMessage = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const text = (overrideInput ?? input).trim();
    if (!text) return;

    let convId = activeConversation;
    if (!convId) {
      convId = Date.now().toString();
      const conv: Conversation = {
        id: convId,
        title: text.substring(0, 42),
        messages: [],
        lastUpdated: new Date(),
      };
      setConversations(prev => [conv, ...prev]);
      setActiveConversation(convId);
    }

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: [...c.messages, userMsg],
      title: c.messages.length === 0 ? text.substring(0, 42) : c.title,
      lastUpdated: new Date(),
    } : c));

    setInput('');
    setLoading(true);

    // Placeholder for streaming
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, messages: [...c.messages, { role: 'assistant', content: '', timestamp: new Date() }],
    } : c));

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          session_id: getSessionId(),
          user_email: user?.email,
          user_role: user?.role,
        }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setConversations(prev => prev.map(c => {
            if (c.id !== convId) return c;
            const msgs = [...c.messages];
            const last = msgs.length - 1;
            if (last >= 0 && msgs[last].role === 'assistant') {
              msgs[last] = { ...msgs[last], content: msgs[last].content + chunk };
            }
            return { ...c, messages: msgs };
          }));
        }
      }
    } catch {
      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const last = msgs.length - 1;
        if (last >= 0 && msgs[last].role === 'assistant') {
          msgs[last] = { ...msgs[last], content: 'Sorry, I encountered a connection error. Please try again.' };
        }
        return { ...c, messages: msgs };
      }));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rateMessage = async (messageIndex: number, rating: 'up' | 'down') => {
    const key = `${activeConversation}-${messageIndex}`;
    if (ratings[key] === rating) {
      setRatings(prev => { const u = { ...prev }; delete u[key]; return u; });
      return;
    }
    setRatings(prev => ({ ...prev, [key]: rating }));
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation,
          message_index: messageIndex,
          question: conv.messages[messageIndex - 1]?.content || '',
          answer: conv.messages[messageIndex]?.content || '',
          rating,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch { /* non-critical */ }
  };

  const isDoctor = user?.role === 'doctor' || user?.role === 'owner';
  const quickActions = isDoctor ? DOCTOR_QUICK_ACTIONS : PATIENT_QUICK_ACTIONS;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Conversation Sidebar ── */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-72
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
        transition-all duration-300 ease-in-out
        bg-white border-r border-gray-200 flex flex-col shadow-xl md:shadow-none
      `}>
        {/* Logo + New Chat */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-sm text-gray-900">Rady AI</h2>
                <p className="text-[11px] text-gray-400">Medical Assistant</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => { startNewConversation(); setSidebarOpen(false); }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Doctor clinical tool shortcuts */}
        {isDoctor && (
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Clinical Tools</p>
            {[
              { href: '/scan-analysis', icon: '🔬', label: 'Scan Analysis' },
              { href: '/report-builder', icon: '📋', label: 'Report Builder' },
              { href: '/medication-guide', icon: '💊', label: 'Medication Guide' },
            ].map(tool => (
              <Link key={tool.href} href={tool.href}>
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-teal-50 text-gray-600 hover:text-teal-700 transition-colors group cursor-pointer">
                  <span className="text-base">{tool.icon}</span>
                  <span className="text-xs font-semibold">{tool.label}</span>
                  <svg className="w-3 h-3 ml-auto text-gray-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* History */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">History</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-3 text-center">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConversation(conv.id); setSidebarOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                    activeConversation === conv.id
                      ? 'bg-teal-50 border-l-2 border-teal-500 pl-2'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-xs text-gray-800 truncate">{conv.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{conv.messages.length} messages</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HIPAA */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[11px] font-semibold text-green-700">HIPAA Compliant</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(s => !s)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Toggle sidebar">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-sm font-bold text-gray-900">{isDoctor ? 'Clinical AI Assistant' : 'Medical AI Assistant'}</h1>
                {user && (
                  <p className="text-[11px] text-gray-400">
                    {user.role === 'doctor' ? '🩺 ' : user.role === 'owner' ? '⚙️ ' : '👤 '}{user.full_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDoctor && (
                <div className="hidden lg:flex items-center gap-1.5">
                  {[
                    { href: '/scan-analysis', label: '🔬 Scan' },
                    { href: '/report-builder', label: '📋 Report' },
                    { href: '/medication-guide', label: '💊 Meds' },
                  ].map(t => (
                    <Link key={t.href} href={t.href}>
                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 hover:bg-teal-100 text-gray-600 hover:text-teal-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                        {t.label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-semibold text-green-700 hidden sm:inline">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <div className="max-w-xl w-full text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1.5">
                  {isDoctor ? 'What can I assist with today?' : 'How can I help you today?'}
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  {isDoctor
                    ? 'Clinical decision support · Drug info · Differential diagnosis · Report drafting'
                    : 'Ask about your condition, medications, or upcoming appointments'}
                </p>

                {/* Doctor clinical tool cards */}
                {isDoctor && (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { href: '/scan-analysis', icon: '🔬', label: 'Scan Analysis', desc: 'AI image reading' },
                      { href: '/report-builder', icon: '📋', label: 'Report Builder', desc: '6 note templates' },
                      { href: '/medication-guide', icon: '💊', label: 'Medication Guide', desc: 'Dosing & interactions' },
                    ].map(tool => (
                      <Link key={tool.href} href={tool.href}>
                        <motion.div
                          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-300 transition-all cursor-pointer text-left"
                        >
                          <div className="text-2xl mb-2">{tool.icon}</div>
                          <p className="text-sm font-bold text-gray-800">{tool.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{tool.desc}</p>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Quick action chips */}
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => { setInput(action.query); inputRef.current?.focus(); }}
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{action.icon}</span>
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-teal-700 transition-colors line-clamp-2">
                          {action.text}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
              {currentMessages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm text-white text-xs font-bold ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-teal-500 to-teal-700'
                      : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  }`}>
                    {message.role === 'assistant' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ) : (
                      user?.full_name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[85%] md:max-w-[78%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 shadow-sm rounded-bl-sm'
                    }`}>
                      {message.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      ) : message.content ? (
                        <div>{renderMarkdown(message.content)}</div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-0.5">
                          {[0, 0.15, 0.3].map(d => (
                            <div key={d} className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && message.content && (
                        <>
                          <button onClick={() => copyToClipboard(message.content, index)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Copy">
                            {copiedId === index ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                          <span className="text-gray-200 select-none text-xs">|</span>
                          {(['up', 'down'] as const).map(r => {
                            const rKey = `${activeConversation}-${index}`;
                            const active = ratings[rKey] === r;
                            return (
                              <button
                                key={r}
                                onClick={() => rateMessage(index, r)}
                                title={r === 'up' ? 'Good response' : 'Poor response'}
                                className={`p-1 rounded transition-colors ${active
                                  ? r === 'up' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                                  : 'text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  {r === 'up'
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                  }
                                </svg>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200/60 bg-white/90 backdrop-blur-md px-4 py-3">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-teal-400 focus-within:bg-white focus-within:shadow-md transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                  placeholder={isDoctor
                    ? 'Ask a clinical question, describe symptoms, or request a differential...'
                    : 'Ask me anything about your health or care...'}
                  className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-gray-900 placeholder-gray-400 text-sm min-h-[48px] max-h-32"
                  rows={1}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-md min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              HIPAA compliant · Encrypted · AI responses are for decision support only, not a substitute for clinical judgement
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
