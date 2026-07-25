"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, TrendingUp, ShieldCheck, XCircle, Send, Loader2, Bot, User, MessageCircle, ServerCog, Presentation, Forward, Mail, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { chatWithTeamMember, delegateToTeamMember, continueChatWithSearch, ChatMessage } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';
import { extractTextFromFile } from '@/app/actions/document';
import { toast, Toaster } from 'sonner';

const TEAM_MEMBERS = [
  { id: 'cmo', title: 'مدير التسويق (CMO)', icon: <TrendingUp className="w-8 h-8 text-orange-500" />, desc: 'خبير التسويق، النمو، والاستحواذ على العملاء' },
  { id: 'cfo', title: 'المحلل المالي (CFO)', icon: <Briefcase className="w-8 h-8 text-blue-500" />, desc: 'إدارة الميزانية، تحليل الأرباح، وترشيد النفقات' },
  { id: 'cso', title: 'المستشار الاستراتيجي (CSO)', icon: <ShieldCheck className="w-8 h-8 text-green-500" />, desc: 'رؤية طويلة المدى، حماية الأصول، وتوجيه الشركة' },
  { id: 'cro', title: 'خبير المبيعات (CRO)', icon: <Users className="w-8 h-8 text-purple-500" />, desc: 'إغلاق الصفقات، تدريب المندوبين، وزيادة الإيرادات' },
  { id: 'coo', title: 'مدير النظام (COO/CTO)', icon: <ServerCog className="w-8 h-8 text-slate-500" />, desc: 'إدارة الخوادم، الأتمتة، وحماية الموارد' }
];

export default function TeamPage() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [pendingEmail, setPendingEmail] = useState<{ to_email: string, subject: string, body: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string, content: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Delegation State
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [delegateContextText, setDelegateContextText] = useState('');
  const [delegateTarget, setDelegateTarget] = useState('cmo');
  const [delegateInstruction, setDelegateInstruction] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const activeMember = TEAM_MEMBERS.find(m => m.id === selectedMember);

  useEffect(() => {
    const memberParam = searchParams?.get('member');
    if (memberParam && TEAM_MEMBERS.find(m => m.id === memberParam)) {
      setSelectedMember(memberParam);
      // Clean up url without reload
      router.replace('/team', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (selectedMember) {
      fetchChatHistory(selectedMember);
    }
  }, [selectedMember]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async (roleId: string) => {
    setIsFetchingHistory(true);
    try {
      const q = query(
        collection(db, 'team_chats'),
        where('roleId', '==', roleId)
      );
      const snapshot = await getDocs(q);
      const historyDocs: any[] = [];
      snapshot.forEach(doc => {
        historyDocs.push(doc.data());
      });
      
      // Sort in memory to avoid requiring a composite index in Firestore
      historyDocs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeA - timeB;
      });
      
      const history: ChatMessage[] = historyDocs.map(data => ({
        role: data.role,
        content: data.content
      }));
      
      setChatHistory(history);
    } catch (error) {
      console.error("Failed to load chat history:", error);
      toast.error('لم نتمكن من استرجاع سجل المحادثات.');
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedMember || isLoading || pendingEmail || isExtracting) return;

    let userText = inputMessage.trim();
    if (attachedFile) {
      userText = `[FILE CONTENT: ${attachedFile.name}]\n${attachedFile.content}\n[/FILE CONTENT]\n\n${userText}`;
    }

    setInputMessage('');
    setAttachedFile(null);
    
    // Add user message to UI immediately
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userText }];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Pass the previous history (excluding the one we just added) to the action
      // The action will save the user message to DB and return the AI response.
      let result = await chatWithTeamMember(selectedMember, userText, chatHistory);
      
      if (result.success && result.isSearching) {
        setSearchStatus(`🔍 يبحث في الإنترنت عن: "${result.query}"...`);
        result = await continueChatWithSearch(selectedMember, chatHistory, result.assistantMessage, result.query);
        setSearchStatus('');
      }

      if (result.success && result.isEmailDraft) {
        setPendingEmail(result.emailData);
        // Do not add the AI's internal thoughts to history until approved/denied
        return;
      }

      if (result.success && result.response) {
        setChatHistory([...updatedHistory, { role: 'assistant', content: result.response }]);
      } else {
        toast.error('فشل الاتصال بالموظف: ' + result.error);
        // Remove user message if failed
        setChatHistory(chatHistory);
      }
    } catch (error) {
      toast.error('حدث خطأ في النظام.');
      setChatHistory(chatHistory);
      setSearchStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDelegate = (messageContent: string) => {
    setDelegateContextText(messageContent);
    setIsDelegateModalOpen(true);
    setDelegateInstruction('');
  };

  const handleDelegateSubmit = async () => {
    if (!delegateTarget || !delegateInstruction.trim()) return;
    setIsDelegating(true);

    const fullMessage = `[تقرير مُحال من زميل آخر]:\n${delegateContextText}\n\n[أوامر وتوجيهات المدير لك]:\n${delegateInstruction}`;

    try {
      const result = await delegateToTeamMember(delegateTarget, fullMessage);
      if (result.success) {
        toast.success('تمت إحالة المهمة بنجاح!');
        setIsDelegateModalOpen(false);
        setSelectedMember(delegateTarget);
      } else {
        toast.error('فشل في الإحالة: ' + result.error);
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع.');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleApproveEmail = async () => {
    if (!pendingEmail) return;
    setIsLoading(true);
    try {
      const res = await executeEmailAction(pendingEmail.to_email, pendingEmail.subject, pendingEmail.body);
      if (res.success) {
        toast.success('تم الإرسال بنجاح!');
        setChatHistory(prev => [...prev, { role: 'assistant', content: `[نجاح] تم إرسال رسالة البريد الإلكتروني إلى ${pendingEmail.to_email} بنجاح.` }]);
      } else {
        toast.error('فشل الإرسال: ' + res.error);
        setChatHistory(prev => [...prev, { role: 'assistant', content: `[فشل] لم أتمكن من إرسال البريد: ${res.error}` }]);
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الإرسال');
    } finally {
      setIsLoading(false);
      setPendingEmail(null);
    }
  };

  const handleDenyEmail = () => {
    setPendingEmail(null);
    setChatHistory(prev => [...prev, { role: 'user', content: 'لقد رفضت إرسال هذه الرسالة. الرجاء تعديلها أو إلغاء الفكرة.' }]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.pdf', '.csv', '.txt'];
    if (!allowedTypes.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error('صيغة الملف غير مدعومة. الرجاء إرفاق PDF, CSV, أو TXT.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز الحد الأقصى (5MB).');
      return;
    }

    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await extractTextFromFile(formData);
      if (result.success) {
        setAttachedFile({ name: result.name || file.name, content: result.text || '' });
        toast.success(`تم قراءة الملف: ${file.name}`);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('فشل استخراج النص من الملف');
    } finally {
      setIsExtracting(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            فريق العمل (The Team)
          </h1>
          <p className="text-slate-500 mt-2">مجلس الإدارة المصغر للذكاء الاصطناعي - تواصل مع خبرائك لاتخاذ قرارات حاسمة</p>
        </div>
        
        <Link href="/boardroom" className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg">
          <Presentation className="w-5 h-5" />
          عقد اجتماع مجلس إدارة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TEAM_MEMBERS.map(member => (
          <motion.div
            key={member.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedMember(member.id)}
            className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {member.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{member.title}</h3>
            <p className="text-slate-500 text-sm">{member.desc}</p>
            <div className="mt-6 w-full py-2 bg-orange-50 text-orange-600 font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
              فتح المحادثة
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedMember && activeMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {activeMember.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{activeMember.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-500">متصل (قاعدة المصلحة مُفعّلة)</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle className="w-7 h-7" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                {isFetchingHistory ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-orange-400" />
                    <p>جاري استرجاع الذاكرة...</p>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
                    <MessageCircle className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">ابدأ النقاش الاستراتيجي الآن</p>
                    <p className="text-sm mt-2 max-w-sm text-center">تذكر: هذا الموظف مبرمج ليعارضك إذا كانت فكرتك تضر بمصلحة الشركة.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200'}`}>
                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-slate-600" />}
                      </div>
                      <div className="flex flex-col gap-2 max-w-[80%]">
                        <div className={`rounded-2xl p-4 whitespace-pre-wrap leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tl-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-tr-sm'}`}>
                          {(() => {
                            if (msg.role === 'user' && msg.content.includes('[FILE CONTENT:')) {
                              const match = msg.content.match(/\[FILE CONTENT: (.*?)\][\s\S]*?\[\/FILE CONTENT\]\n*/);
                              if (match) {
                                return (
                                  <>
                                    <div className="flex items-center gap-2 mb-2 bg-orange-600/50 text-white px-3 py-1.5 rounded-lg text-xs font-medium w-fit">
                                      <Paperclip className="w-3.5 h-3.5" />
                                      <span>تم قراءة الملف: {match[1]}</span>
                                    </div>
                                    {msg.content.replace(match[0], '')}
                                  </>
                                );
                              }
                            }
                            return msg.content;
                          })()}
                        </div>
                        {msg.role === 'assistant' && (
                          <button 
                            onClick={() => handleOpenDelegate(msg.content)}
                            className="self-start flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            <Forward className="w-3.5 h-3.5" />
                            إحالة / تفويض 
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tr-none px-6 py-4 shadow-sm flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      {searchStatus && (
                        <span className="text-xs font-bold text-orange-500 animate-pulse bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                          {searchStatus}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {pendingEmail && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start my-4">
                    <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-md w-full max-w-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4 relative z-10">
                        <Mail className="w-6 h-6 text-indigo-500" />
                        أعدّ الموظف رسالة بريد إلكتروني
                      </h3>
                      
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 relative z-10 space-y-3">
                        <div className="flex gap-2">
                          <span className="text-slate-500 font-bold w-16">إلى:</span>
                          <span className="text-slate-800 font-medium">{pendingEmail.to_email}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-slate-500 font-bold w-16">الموضوع:</span>
                          <span className="text-slate-800 font-medium">{pendingEmail.subject}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 mt-2">
                          <span className="text-slate-500 font-bold block mb-2">المحتوى:</span>
                          <div className="text-slate-700 text-sm bg-white p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto" dangerouslySetInnerHTML={{ __html: pendingEmail.body }}></div>
                        </div>
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <button
                          onClick={handleApproveEmail}
                          disabled={isLoading}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          اعتماد وإرسال ✅
                        </button>
                        <button
                          onClick={handleDenyEmail}
                          disabled={isLoading}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl transition-all border border-rose-100 flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          رفض ❌
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-2">
                {attachedFile && (
                  <div className="self-start inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                    <Paperclip className="w-4 h-4" />
                    <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                    <button 
                      type="button" 
                      onClick={() => setAttachedFile(null)}
                      className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex gap-4 relative">
                  <input 
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.csv,.txt"
                    onChange={handleFileChange}
                    disabled={isExtracting || isLoading || pendingEmail !== null}
                  />
                  <label 
                    htmlFor="file-upload"
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-colors ${isExtracting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                  >
                    {isExtracting ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Paperclip className="w-5 h-5" />}
                  </label>
                  
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={pendingEmail ? "يرجى اتخاذ قرار بشأن البريد أعلاه..." : isExtracting ? "جاري قراءة الملف..." : `اكتب توجيهاتك لـ ${activeMember.title}...`}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl py-4 pr-14 pl-16 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all shadow-inner"
                    disabled={isLoading || isFetchingHistory || pendingEmail !== null || isExtracting}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isFetchingHistory || !inputMessage.trim() || pendingEmail !== null || isExtracting}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-orange-500"
                  >
                    <Send className="w-5 h-5 -mr-1" />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delegation Modal */}
      <AnimatePresence>
        {isDelegateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 p-6 md:p-8 relative"
            >
              <button 
                onClick={() => setIsDelegateModalOpen(false)}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                disabled={isDelegating}
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <Forward className="w-7 h-7 text-orange-500" />
                إحالة المهمة (Delegation)
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">النص المُحال:</label>
                  <div className="bg-slate-50 text-slate-600 p-4 rounded-xl text-sm border border-slate-200 h-32 overflow-y-auto whitespace-pre-wrap">
                    {delegateContextText}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">إلى الموظف المستهدف:</label>
                  <select 
                    value={delegateTarget} 
                    onChange={e => setDelegateTarget(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer font-medium"
                    disabled={isDelegating}
                  >
                    {TEAM_MEMBERS.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">أوامرك وتوجيهاتك:</label>
                  <textarea 
                    value={delegateInstruction}
                    onChange={e => setDelegateInstruction(e.target.value)}
                    placeholder="اكتب توجيهاتك للموظف الجديد هنا ليعمل على هذا التقرير..."
                    className="w-full h-32 bg-white border border-slate-300 text-slate-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none font-medium leading-relaxed"
                    disabled={isDelegating}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsDelegateModalOpen(false)}
                    disabled={isDelegating}
                    className="px-6 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleDelegateSubmit}
                    disabled={isDelegating || !delegateInstruction.trim()}
                    className="px-6 py-3 text-white bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {isDelegating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    إرسال وإحالة
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
