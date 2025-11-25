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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            lastUpdated: new Date(),
          };
        }
        return conv;
      }));
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

  const quickActions = [
    'Patient intake questionnaire',
    'Medication interaction check',
    'Clinical guideline lookup',
    'HIPAA compliance query'
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        {/* Logo & Profile */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              RC
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Rady Children's</h2>
              <p className="text-xs text-gray-500">GenAI Medical Assistant</p>
            </div>
          </div>
          <button
            onClick={startNewConversation}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Conversation
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Recent Conversations</h3>
          <div className="space-y-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${activeConversation === conv.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                  }`}
              >
                <p className="font-medium text-sm text-gray-900 truncate">{conv.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {conv.messages.length} messages · {new Date(conv.lastUpdated).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* HIPAA Compliance Badge */}
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-xs font-semibold">HIPAA Compliant</p>
              <p className="text-xs">End-to-end encrypted</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Medical AI Assistant</h1>
                <p className="text-sm text-gray-500">Powered by Advanced Language Models</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-green-700">System Online</span>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentMessages.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Rady Children's GenAI Assistant</h2>
                <p className="text-lg text-gray-600 mb-8">Ask questions about patient care, medications, clinical guidelines, or HIPAA compliance</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(action)}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{action}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {currentMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  )}

                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <div
                      className={`rounded-2xl px-5 py-3 shadow-sm ${message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1.5 px-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="text-sm text-gray-500 ml-2">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  className="w-full px-5 py-4 bg-transparent resize-none focus:outline-none text-gray-900 placeholder-gray-400"
                  rows={1}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              All conversations are HIPAA compliant and encrypted end-to-end
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

