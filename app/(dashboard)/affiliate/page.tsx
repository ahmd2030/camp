"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Link as LinkIcon, Mail, Play, Plus, Target, Trash2, Edit, Save, X, Search, CheckCircle2, User, Loader2, Sparkles, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { chatWithTeamMember } from '@/app/actions/team';
import { 
  createAffiliateLink, getAffiliateLinks, deleteAffiliateLink, updateAffiliateLink, AffiliateLink,
  createMailingList, getMailingLists, deleteMailingList, MailingList
} from '@/app/actions/affiliate';
import { createScheduledTask } from '@/app/actions/cron';
import { logSmartError } from '@/app/actions/monitor';

type Tab = 'consultant' | 'links' | 'autopilot';

export default function AffiliatePage() {
  const [activeTab, setActiveTab] = useState<Tab>('consultant');

  // --- Niche Consultant State ---
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'system' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingOpportunity, setPendingOpportunity] = useState<{ niche: string, productName: string } | null>(null);
  const [takeoffLink, setTakeoffLink] = useState('');
  const [takeoffList, setTakeoffList] = useState('');
  const [isTakingOff, setIsTakingOff] = useState(false);

  // --- Links Bank State ---
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ niche: '', productName: '', affiliateLink: '', status: true });

  // --- Autopilot State ---
  const [lists, setLists] = useState<MailingList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [newList, setNewList] = useState({ name: '', emails: '' });
  
  // Autopilot Task Setup
  const [selectedLink, setSelectedLink] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isStartingAutopilot, setIsStartingAutopilot] = useState(false);

  useEffect(() => {
    fetchLists(); // Fetch lists early for the dropdown
    if (activeTab === 'links') fetchLinks();
    if (activeTab === 'autopilot') {
      fetchLinks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // --- Niche Consultant Logic ---
  const handleConsult = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const userMessage = customPrompt || chatInput;
    if (!userMessage.trim()) return;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsConsulting(true);

    const isDiscovery = customPrompt !== undefined;
    let fullPrompt = `أنا أسألك بصفتك مستشار التسويق بالعمولة (Affiliate Marketing). ساعدني في هذا الطلب: ${userMessage}`;
    
    if (isDiscovery) {
      fullPrompt = `أنت مدير تسويق Affiliate محترف. ابحث واقترح لي فوراً منتجاً واحداً محدداً ومربحاً جداً في الوقت الحالي. أجب حصراً بصيغة JSON كالتالي: {"niche": "اسم المجال", "productName": "اسم المنتج", "reason": "سبب اختيارك له باختصار"}. لا تضف أي نص آخر خارج الـ JSON.`;
    }

    try {
      const res = await chatWithTeamMember('cmo', fullPrompt, chatHistory);
      
      if (!res.success) {
        throw new Error(res.error || "Server Error from CMO");
      }

      if (res.success && res.response) {
        if (isDiscovery) {
          try {
            const match = res.response.match(/\{[\s\S]*\}/);
            if (match) {
              const data = JSON.parse(match[0]);
              setPendingOpportunity({ niche: data.niche, productName: data.productName });
              setChatHistory(prev => [...prev, { role: 'assistant', content: `لقد وجدت فرصة ممتازة!\n\n**المجال:** ${data.niche}\n**المنتج:** ${data.productName}\n**السبب:** ${data.reason}` }]);
            } else {
               window.alert('السيرفر رد بنجاح ولكن ببيانات لا تحتوي JSON: ' + JSON.stringify(res));
               setChatHistory(prev => [...prev, { role: 'assistant', content: res.response! }]);
            }
          } catch (err) {
            window.alert('السيرفر رد بنجاح ولكن فشل تحليل JSON: ' + JSON.stringify(res));
            setChatHistory(prev => [...prev, { role: 'assistant', content: res.response! }]);
          }
        } else {
          setChatHistory(prev => [...prev, { role: 'assistant', content: res.response! }]);
        }
      }
    } catch (error: any) {
      console.error("Autopilot UI Error:", error);
      toast.error('حدث خطأ تقني في الواجهة ولم يصل الطلب للـ API');
      window.alert("🚨 عطل الطوارئ: " + (error.message || JSON.stringify(error)));
      await logSmartError("Autopilot UI Error: " + (error.message || "Unknown error"));
    } finally {
      setIsConsulting(false);
    }
  };

  const handleTakeoff = async () => {
    if (!takeoffLink || !takeoffList || !pendingOpportunity) {
      toast.error('يرجى إدخال الرابط واختيار القائمة البريدية');
      return;
    }
    setIsTakingOff(true);

    // 1. Save Link
    const linkRes = await createAffiliateLink({
      niche: pendingOpportunity.niche,
      productName: pendingOpportunity.productName,
      affiliateLink: takeoffLink,
      status: true
    });

    if (linkRes.success) {
      // 2. Create Autopilot Cron Task
      const taskRes = await createScheduledTask({
        agentId: 'cmo',
        prompt: `[Affiliate Autopilot] ترويج لمنتج ${pendingOpportunity.productName}`,
        frequency: 'weekly',
        isActive: true,
        // @ts-ignore
        type: 'affiliate_autopilot',
        linkId: linkRes.id,
        listId: takeoffList
      });

      if (taskRes.success) {
        toast.success('تم الإقلاع بنجاح! 🚀 الطائرة الآن في الجو.');
        setPendingOpportunity(null);
        setTakeoffLink('');
        setTakeoffList('');
      } else {
        toast.error('تم حفظ الرابط ولكن فشل إطلاق الطائرة الآلية.');
      }
    } else {
      toast.error('حدث خطأ أثناء حفظ الرابط.');
    }
    
    setIsTakingOff(false);
  };

  // --- Links Logic ---
  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    const res = await getAffiliateLinks();
    if (res.success) setLinks(res.links || []);
    setIsLoadingLinks(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.niche || !newLink.productName || !newLink.affiliateLink) {
      toast.error('الرجاء تعبئة جميع الحقول');
      return;
    }
    const res = await createAffiliateLink(newLink);
    if (res.success) {
      toast.success('تمت إضافة الرابط بنجاح');
      setShowAddLink(false);
      setNewLink({ niche: '', productName: '', affiliateLink: '', status: true });
      fetchLinks();
    } else {
      toast.error(res.error);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرابط؟')) return;
    const res = await deleteAffiliateLink(id);
    if (res.success) {
      toast.success('تم الحذف');
      fetchLinks();
    }
  };

  // --- Mailing List Logic ---
  const fetchLists = async () => {
    setIsLoadingLists(true);
    const res = await getMailingLists();
    if (res.success) setLists(res.lists || []);
    setIsLoadingLists(false);
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name || !newList.emails) {
      toast.error('الرجاء تعبئة الحقول');
      return;
    }
    const res = await createMailingList(newList.name, newList.emails);
    if (res.success) {
      toast.success(`تم إنشاء القائمة بنجاح، تحتوي على ${res.count} بريد إلكتروني صالح.`);
      setShowAddList(false);
      setNewList({ name: '', emails: '' });
      fetchLists();
    } else {
      toast.error(res.error || 'حدث خطأ');
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القائمة؟')) return;
    const res = await deleteMailingList(id);
    if (res.success) {
      toast.success('تم الحذف');
      fetchLists();
    }
  };

  // --- Autopilot Logic ---
  const handleStartAutopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLink || !selectedList) {
      toast.error('يرجى اختيار الرابط والقائمة البريدية');
      return;
    }
    
    setIsStartingAutopilot(true);
    const link = links.find(l => l.id === selectedLink);
    const list = lists.find(l => l.id === selectedList);

    try {
      const res = await createScheduledTask({
        agentId: 'cmo',
        prompt: `[Affiliate Autopilot] ترويج لمنتج ${link?.productName} للقائمة ${list?.name}`,
        frequency: frequency,
        isActive: true,
        // @ts-ignore (we inject custom fields)
        type: 'affiliate_autopilot',
        linkId: selectedLink,
        listId: selectedList
      });

      if (!res.success) {
        throw new Error(res.error || "Server Error from Cron Task");
      }

      toast.success('تم إطلاق نظام الطائرة بنجاح! سيقوم المستشار بإرسال الحملات تلقائياً.');
      setSelectedLink('');
      setSelectedList('');
    } catch (error: any) {
      console.error("Autopilot Cron Error:", error);
      toast.error('حدث خطأ تقني في الواجهة أثناء إطلاق الطائرة');
      window.alert("🚨 عطل الطوارئ: " + (error.message || JSON.stringify(error)));
      await logSmartError("Autopilot Cron Error (UI): " + (error.message || "Unknown error"));
    } finally {
      setIsStartingAutopilot(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
          <Target className="w-8 h-8 text-rose-500 fill-rose-100" />
          وحدة التسويق بالعمولة (Affiliate Marketing)
        </h1>
        <p className="text-slate-500 text-lg">نظام أتمتة متكامل للبحث عن المجالات المربحة وترويجها ذاتياً.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-max mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('consultant')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'consultant' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Sparkles className="w-5 h-5" />
          مستشار المجالات
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'links' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <LinkIcon className="w-5 h-5" />
          بنك الروابط
        </button>
        <button
          onClick={() => setActiveTab('autopilot')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'autopilot' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Play className="w-5 h-5" />
          نظام الطائرة (Autopilot)
        </button>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto">
        
        {/* TAB 1: Consultant */}
        {activeTab === 'consultant' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">غرفة عمليات الطيار الآلي (CMO)</h3>
                  <p className="text-xs text-slate-500">متصل وجاهز للبحث عبر الإنترنت</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleConsult(undefined, 'اكتشف فرصة')} 
                  disabled={isConsulting}
                  className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 inline-block mr-1" />
                  اكتشاف الفرص
                </button>
                <button onClick={() => {setActiveTab('links'); setShowAddLink(true)}} className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg font-bold transition-colors">
                  + تسجيل منتج يدوي
                </button>
              </div>
            </div>

            <div className="flex flex-col h-full bg-slate-50/50 relative">
              
              {/* Pending Opportunity Overlay */}
              <AnimatePresence>
                {pendingOpportunity && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-20 left-4 right-4 bg-white p-5 rounded-2xl shadow-xl border border-rose-200 z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Target className="w-4 h-4 text-rose-500" />
                          فرصة معلقة: {pendingOpportunity.productName}
                        </h4>
                        <p className="text-xs text-slate-500">المجال: {pendingOpportunity.niche}</p>
                      </div>
                      <button onClick={() => setPendingOpportunity(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-3">
                      <input 
                        type="url" 
                        value={takeoffLink} 
                        onChange={e => setTakeoffLink(e.target.value)} 
                        placeholder="أدخل رابط الإحالة الخاص بك هنا..." 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500 text-left" 
                        dir="ltr"
                      />
                      <select 
                        value={takeoffList} 
                        onChange={e => setTakeoffList(e.target.value)} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">-- اختر القائمة البريدية --</option>
                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.emails.length})</option>)}
                      </select>
                      <button 
                        onClick={handleTakeoff}
                        disabled={isTakingOff || !takeoffLink || !takeoffList}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isTakingOff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        إقلاع 🚀
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 pb-32">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
                    <Search className="w-12 h-12 mb-4 text-slate-300" />
                    <p>اسألني عن أفضل المنتجات، أو اضغط على "اكتشاف الفرص".</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'mr-auto flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-4 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-white border border-slate-100 rounded-tl-sm shadow-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isConsulting && (
                   <div className="flex gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                       <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className="text-slate-500 text-sm">يقوم بالبحث وتحليل الأسواق...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleConsult} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isConsulting}
                placeholder="ابحث عن أفضل برامج الأفلييت في مجال السفر..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button disabled={isConsulting || !chatInput.trim()} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center w-12">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}

        {/* TAB 2: Links Bank */}
        {activeTab === 'links' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">بنك روابط الإحالة</h2>
              <button onClick={() => setShowAddLink(!showAddLink)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                {showAddLink ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddLink ? 'إلغاء' : 'إضافة رابط جديد'}
              </button>
            </div>

            <AnimatePresence>
              {showAddLink && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddLink}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">المجال (Niche)</label>
                      <input type="text" value={newLink.niche} onChange={e => setNewLink({...newLink, niche: e.target.value})} placeholder="مثال: استضافة مواقع" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-800/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج</label>
                      <input type="text" value={newLink.productName} onChange={e => setNewLink({...newLink, productName: e.target.value})} placeholder="مثال: Bluehost" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-800/50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">رابط الإحالة الخاص بك (Affiliate Link)</label>
                    <input type="url" value={newLink.affiliateLink} onChange={e => setNewLink({...newLink, affiliateLink: e.target.value})} placeholder="https://bluehost.com/track/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-800/50 text-left" dir="ltr" />
                  </div>
                  <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full md:w-auto">حفظ الرابط</button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoadingLinks ? (
                <div className="p-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
              ) : links.length === 0 ? (
                <div className="p-12 text-center text-slate-400">لا توجد روابط مسجلة حتى الآن</div>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold">المنتج</th>
                      <th className="p-4 font-bold hidden md:table-cell">المجال</th>
                      <th className="p-4 font-bold">الرابط</th>
                      <th className="p-4 font-bold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {links.map(link => (
                      <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{link.productName}</td>
                        <td className="p-4 hidden md:table-cell text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded-md text-xs">{link.niche}</span></td>
                        <td className="p-4 text-slate-500 truncate max-w-[200px]" dir="ltr">{link.affiliateLink}</td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteLink(link.id!)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: Autopilot */}
        {activeTab === 'autopilot' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Launch Autopilot */}
            <div className="bg-gradient-to-b from-slate-900 to-black rounded-3xl p-8 shadow-xl text-white border border-slate-800 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-rose-500/10 blur-[100px] rounded-full"></div>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 relative z-10">
                <Play className="w-6 h-6 text-rose-500 fill-rose-500" />
                تفعيل نظام الطائرة
              </h2>
              <p className="text-slate-400 mb-8 text-sm leading-relaxed relative z-10">سيقوم الذكاء الاصطناعي بكتابة رسائل ترويجية احترافية وإرسالها دورياً بالنيابة عنك للقائمة البريدية المختارة.</p>

              <form onSubmit={handleStartAutopilot} className="space-y-5 relative z-10 flex-1 flex flex-col">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">اختر المنتج للترويج</label>
                  <select value={selectedLink} onChange={e => setSelectedLink(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 appearance-none">
                    <option value="">-- اختر الرابط --</option>
                    {links.map(l => <option key={l.id} value={l.id}>{l.productName} ({l.niche})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">القائمة البريدية المستهدفة</label>
                  <select value={selectedList} onChange={e => setSelectedList(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 appearance-none">
                    <option value="">-- اختر القائمة --</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.emails.length} عميل)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">معدل الإرسال الآلي</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/50 appearance-none">
                    <option value="daily">يومياً (حملة مكثفة)</option>
                    <option value="weekly">أسبوعياً (مستحسن)</option>
                    <option value="monthly">شهرياً (تذكير)</option>
                  </select>
                </div>
                <div className="mt-auto pt-6">
                   <button type="submit" disabled={isStartingAutopilot || !selectedLink || !selectedList} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-rose-600">
                    {isStartingAutopilot ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    إطلاق الحملة الآلية
                  </button>
                </div>
              </form>
            </div>

            {/* Mailing Lists Manager */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-500" /> القوائم البريدية</h2>
                <button onClick={() => setShowAddList(!showAddList)} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors">
                  {showAddList ? 'إلغاء' : '+ قائمة جديدة'}
                </button>
              </div>

              <AnimatePresence>
                {showAddList && (
                  <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddList} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">اسم القائمة</label>
                      <input type="text" value={newList.name} onChange={e => setNewList({...newList, name: e.target.value})} placeholder="مثال: مهتمين بالرياضة" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">الإيميلات المستهدفة (مفصولة بفواصل أو أسطر)</label>
                      <textarea value={newList.emails} onChange={e => setNewList({...newList, emails: e.target.value})} placeholder="user1@mail.com&#10;user2@mail.com" className="w-full h-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-left" dir="ltr" />
                      <p className="text-xs text-slate-400 mt-1">سيتم تلقائياً تنظيف القائمة من المسافات والفراغات والإيميلات المكررة.</p>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg">حفظ القائمة</button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingLists ? (
                   <div className="text-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : lists.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد قوائم بريدية، أضف قائمتك الأولى.</div>
                ) : (
                  lists.map(list => (
                    <div key={list.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white hover:border-slate-300 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800">{list.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold">{list.emails.length} عميل مستهدف</p>
                      </div>
                      <button onClick={() => handleDeleteList(list.id!)} className="text-rose-400 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
