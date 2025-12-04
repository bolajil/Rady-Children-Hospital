'use client';

import { useState, useRef, useEffect } from 'react';

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

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentMessages = activeConversation
    ? conversations.find(c => c.id === activeConversation)?.messages || []
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const startNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      lastUpdated: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversation(newConv.id);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!activeConversation) {
      startNewConversation();
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversation) {
        const updatedMessages = [...conv.messages, userMessage];
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.messages.length === 0 ? input.substring(0, 30) + '...' : conv.title,
          lastUpdated: new Date(),
        };
      }
      return conv;
    }));

    setInput('');
    setLoading(true);

    try {
      // Stream via /api/chat/stream for faster perceived latency
      const convId = activeConversation;
      // Prepare a placeholder assistant message we will incrementally update
      setConversations(prev => prev.map(conv => {
        if (conv.id === convId) {
          return {
            ...conv,
            messages: [...conv.messages, { role: 'assistant', content: '', timestamp: new Date() }],
            lastUpdated: new Date(),
          };
        }
        return conv;
      }));

      const response = await fetch(`/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      if (!response.body) {
        // Fallback to non-streaming endpoint if body is not readable (e.g., older browsers)
        const fallback = await fetch(`/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: input }),
        });
        const data = await fallback.json();
        setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
            const msgs = [...conv.messages];
            // Replace the last (placeholder) assistant message content
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
              msgs[lastIdx] = { ...msgs[lastIdx], content: data.response };
            } else {
              msgs.push({ role: 'assistant', content: data.response, timestamp: new Date() });
            }
            return { ...conv, messages: msgs, lastUpdated: new Date() };
          }
          return conv;
        }));
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          const chunk = value ? decoder.decode(value, { stream: true }) : '';
          if (chunk) {
            setConversations(prev => prev.map(conv => {
              if (conv.id === convId) {
                const msgs = [...conv.messages];
                const lastIdx = msgs.length - 1;
                if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                  msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + chunk };
                } else {
                  msgs.push({ role: 'assistant', content: chunk, timestamp: new Date() });
                }
                return { ...conv, messages: msgs, lastUpdated: new Date() };
              }
              return conv;
            }));
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the backend service.',
        timestamp: new Date(),
      };
      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation) {
          return { ...conv, messages: [...conv.messages, errorMessage] };
        }
        return conv;
      }));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const rateMessage = async (messageIndex: number, rating: 'up' | 'down') => {
    const ratingKey = `${activeConversation}-${messageIndex}`;
    const previousRating = ratings[ratingKey];
    
    // Toggle off if same rating clicked
    if (previousRating === rating) {
      setRatings(prev => {
        const updated = { ...prev };
        delete updated[ratingKey];
        return updated;
      });
      return;
    }
    
    // Update local state immediately
    setRatings(prev => ({ ...prev, [ratingKey]: rating }));
    
    // Get the question (previous user message) and answer (current assistant message)
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;
    
    const assistantMessage = conversation.messages[messageIndex];
    const userMessage = conversation.messages[messageIndex - 1];
    
    // Send feedback to backend for LLM retraining
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation,
          message_index: messageIndex,
          question: userMessage?.content || '',
          answer: assistantMessage?.content || '',
          rating: rating,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const quickActions = [
    { icon: '📋', text: 'Patient intake form', query: 'Help me create a patient intake questionnaire' },
    { icon: '💊', text: 'Check drug interactions', query: 'Check medication interactions for a patient' },
    { icon: '📖', text: 'Clinical guidelines', query: 'What are the latest clinical guidelines for' },
    { icon: '🔒', text: 'HIPAA compliance', query: 'What are the HIPAA compliance requirements for' },
    { icon: '🩺', text: 'Symptom assessment', query: 'Help assess symptoms for a patient presenting with' },
    { icon: '📅', text: 'Care plan', query: 'Create a care plan for a patient with' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Slide in on mobile */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-80 
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'} 
        transition-all duration-300 ease-in-out
        bg-white border-r border-gray-200 flex flex-col shadow-xl md:shadow-none
      `}>
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                RC
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Rady Children's</h2>
                <p className="text-xs text-gray-500">Medical AI</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => { startNewConversation(); setSidebarOpen(false); }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg min-h-[48px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">History</h3>
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-400 px-2 py-4 text-center">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConversation(conv.id); setSidebarOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl transition-all min-h-[48px] ${
                    activeConversation === conv.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-800 truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {conv.messages.length} msgs
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium text-green-700">HIPAA Compliant</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Medical AI Assistant</h1>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-gray-900">Rady AI</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-medium text-green-700 hidden sm:inline">Online</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center p-4 md:p-8">
              <div className="max-w-2xl w-full text-center">
                {/* Welcome Icon */}
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 mb-8 text-sm md:text-base">
                  Ask about patient care, medications, or clinical guidelines
                </p>

                {/* Quick Actions - Responsive Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setInput(action.query); inputRef.current?.focus(); }}
                      className="p-3 md:p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left group min-h-[60px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{action.icon}</span>
                        <span className="text-xs md:text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {action.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {currentMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${
                    message.role === 'assistant' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    {message.role === 'assistant' ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && message.content && (
                        <>
                          {/* Copy Button */}
                          <button
                            onClick={() => copyToClipboard(message.content, index)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copy message"
                          >
                            {copiedId === index ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Rating Divider */}
                          <span className="text-gray-300">|</span>
                          
                          {/* Thumbs Up */}
                          <button
                            onClick={() => rateMessage(index, 'up')}
                            className={`p-1 rounded transition-colors ${
                              ratings[`${activeConversation}-${index}`] === 'up'
                                ? 'bg-green-100 text-green-600'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-green-500'
                            }`}
                            title="Good response"
                          >
                            <svg className="w-3.5 h-3.5" fill={ratings[`${activeConversation}-${index}`] === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          
                          {/* Thumbs Down */}
                          <button
                            onClick={() => rateMessage(index, 'down')}
                            className={`p-1 rounded transition-colors ${
                              ratings[`${activeConversation}-${index}`] === 'down'
                                ? 'bg-red-100 text-red-600'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
                            }`}
                            title="Poor response"
                          >
                            <svg className="w-3.5 h-3.5" fill={ratings[`${activeConversation}-${index}`] === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-lg px-4 py-3 sticky bottom-0">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-md transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder="Ask me anything..."
                  className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-gray-900 placeholder-gray-400 text-base min-h-[48px] max-h-32"
                  rows={1}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Send message"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              HIPAA compliant · End-to-end encrypted
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

