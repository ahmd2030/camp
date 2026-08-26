"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Search, User, MessageSquare, Reply, Clock, Send, CheckCircle2, ChevronRight, Phone, Briefcase } from 'lucide-react';
import { collection, query, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';

type MessageType = 'inbound' | 'outbound' | 'ai_reply';

interface ChatMessage {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  sender: 'client' | 'ai' | 'system';
}

interface Conversation {
  email: string;
  name: string;
  phone?: string;
  niche?: string;
  messages: ChatMessage[];
  lastActivity: Date;
}

export default function InboxChatCRM() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const convosMap = new Map<string, Conversation>();

        // 1. Fetch Contact Messages (Inbound + AI Replies)
        const inqQ = query(collection(db, 'contact_messages'));
        const inqSnap = await getDocs(inqQ);
        inqSnap.forEach(doc => {
          const data = doc.data();
          const email = data.email?.toLowerCase().trim();
          if (!email) return;

          if (!convosMap.has(email)) {
            convosMap.set(email, {
              email,
              name: data.customerName || email.split('@')[0],
              phone: data.customerPhone,
              niche: data.customerNiche,
              messages: [],
              lastActivity: new Date(0)
            });
          }

          const convo = convosMap.get(email)!;
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();

          // Client's incoming message
          if (data.message || data.customerRequest) {
            convo.messages.push({
              id: doc.id + '_in',
              type: 'inbound',
              sender: 'client',
              text: data.message || data.customerRequest,
              timestamp: createdAt
            });
          }

          // AI's reply
          if (data.finalResponse || data.aiDraftResponse) {
            convo.messages.push({
              id: doc.id + '_ai',
              type: 'ai_reply',
              sender: 'ai',
              text: data.finalResponse || data.aiDraftResponse,
              timestamp: new Date(createdAt.getTime() + 1000) // slight delay for sorting
            });
          }
        });

        // 2. Fetch Sent Leads (Outbound drip campaigns)
        const leadsQ = query(collection(db, 'sent_leads'));
        const leadsSnap = await getDocs(leadsQ);
        leadsSnap.forEach(doc => {
          const data = doc.data();
          const email = data.clientEmail?.toLowerCase().trim() || data.email?.toLowerCase().trim();
          if (!email) return;

          if (!convosMap.has(email)) {
            convosMap.set(email, {
              email,
              name: data.businessName || email.split('@')[0],
              messages: [],
              lastActivity: new Date(0)
            });
          }

          const convo = convosMap.get(email)!;
          const sentAt = new Date(data.sentAt || data.lastContactedAt || Date.now());

          if (data.lastMessage) {
            convo.messages.push({
              id: doc.id + '_out',
              type: 'outbound',
              sender: 'system',
              text: data.lastMessage,
              timestamp: sentAt
            });
          }
        });

        // 3. Sort messages and set lastActivity
        const finalConvos = Array.from(convosMap.values()).map(convo => {
          convo.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          if (convo.messages.length > 0) {
            convo.lastActivity = convo.messages[convo.messages.length - 1].timestamp;
          }
          return convo;
        }).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()); // Newest activity first

        setConversations(finalConvos);
      } catch (err) {
        console.error("Error fetching CRM data:", err);
        toast.error("فشل في تحميل المحادثات");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedEmail) {
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedEmail, conversations]);

  const filteredConvos = conversations.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConvo = conversations.find(c => c.email === selectedEmail);

  return (
    <div className="h-[85vh] w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row" dir="rtl">
      <Toaster position="top-center" richColors />
      
        {/* Sidebar (Contacts List) */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-l border-slate-100 flex flex-col bg-slate-50/50 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-slate-200 bg-white">
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              محادثات العملاء
            </h1>
            <div className="mt-4 relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="ابحث عن عميل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="text-center p-10 text-slate-400 font-medium">لا توجد محادثات.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConvos.map(convo => {
                  const lastMsg = convo.messages[convo.messages.length - 1];
                  const isSelected = selectedEmail === convo.email;
                  return (
                    <div 
                      key={convo.email}
                      onClick={() => setSelectedEmail(convo.email)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-100 flex items-start gap-3 ${isSelected ? 'bg-indigo-50/80 border-r-4 border-indigo-600' : 'border-r-4 border-transparent'}`}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-full flex items-center justify-center font-bold shrink-0 border border-indigo-200">
                        {convo.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-slate-800 truncate text-sm">{convo.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {convo.lastActivity.toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {lastMsg?.sender === 'ai' ? '🤖: ' : lastMsg?.sender === 'system' ? '📢: ' : ''}
                          {lastMsg?.text || 'لا توجد رسائل'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col bg-white ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          {!selectedConvo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/50">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                <Mail className="w-10 h-10 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700 mb-2">CRM المحادثات الذكية</h2>
              <p className="text-slate-500 font-medium max-w-sm">اختر عميلاً من القائمة الجانبية لعرض تاريخ الرسائل والردود بينه وبين مدير التسويق الآلي.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-20 border-b border-slate-100 px-6 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg border border-indigo-200">
                    {selectedConvo.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-800 leading-tight">{selectedConvo.name}</h2>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedConvo.email}</span>
                      {selectedConvo.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedConvo.phone}</span>}
                    </p>
                  </div>
                </div>
                {selectedConvo.niche && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                    <Briefcase className="w-4 h-4" />
                    {selectedConvo.niche}
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 space-y-6">
                {selectedConvo.messages.map((msg) => {
                  const isClient = msg.sender === 'client';
                  const isAI = msg.sender === 'ai';

                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 w-full ${isClient ? 'justify-start' : 'justify-end'}`}
                    >
                      {/* Avatar for Client */}
                      {isClient && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex-none flex items-center justify-center text-xs shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                        <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed
                          ${isClient 
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none' 
                            : isAI
                              ? 'bg-emerald-600 text-white rounded-tl-none'
                              : 'bg-orange-50 border border-orange-100 text-slate-800 rounded-tl-none'
                          }`}
                          dir="rtl"
                        >
                          <div className="whitespace-pre-wrap break-words text-right">
                            {msg.text.replace(/<br\s*\/?>/gi, '\n').replace(new RegExp('<[^>]*>?', 'gm'), '').trim()}
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 px-1`}>
                          <Clock className="w-3 h-3" />
                          {msg.timestamp.toLocaleDateString('ar-SA')} - {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {!isClient && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />}
                        </div>
                      </div>
                      
                      {/* Avatar for AI/System */}
                      {!isClient && (
                        <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center border 
                          ${isAI ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-500 text-white border-orange-600'} text-xs 
                          shadow-sm font-bold`}>
                          {isAI ? 'AI' : <Send className="w-3 h-3" />}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input (Readonly for now as AI handles it) */}
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                  <Reply className="w-5 h-5 text-indigo-400" />
                  مدير التسويق الذكي (CMO) يتولى الرد تلقائياً على هذا العميل عبر الإيميل.
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
