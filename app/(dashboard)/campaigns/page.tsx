"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Clock, Play, AlertTriangle, CheckCircle2, XCircle, Loader2, MessageCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { processCampaignLead } from '@/app/actions/campaigns';
import { getPendingFollowUps, executeDripLead } from '@/app/actions/drip';

interface CampaignLead {
  id: string;
  businessName: string;
  phone: string;
  status: string;
  aiPitch?: string;
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<'bulk' | 'drip'>('bulk');
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [dripLeads, setDripLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Campaign State
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ id: string; success: boolean; message: string }[]>([]);
  const [showHoursWarning, setShowHoursWarning] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'bulk') {
      fetchReadyLeads();
    } else {
      fetchDripLeads();
    }
  }, [activeTab]);

  const fetchReadyLeads = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'leads'), where('status', 'in', ['READY_TO_SEND', 'PENDING']));
      const snapshot = await getDocs(q);
      const fetched: CampaignLead[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as CampaignLead);
      });
      setLeads(fetched);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('فشل جلب العملاء المستهدفين.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDripLeads = async () => {
    setLoading(true);
    try {
      const result = await getPendingFollowUps();
      if (result.success && result.leads) {
        setDripLeads(result.leads);
        setSelectedIds(new Set(result.leads.map((l: any) => l.id))); // Auto select all for drip
      } else {
        toast.error(result.error || 'فشل جلب المتابعات');
      }
    } catch (error) {
      toast.error('خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    const currentList = activeTab === 'bulk' ? leads : dripLeads;
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((l: any) => l.id)));
    }
  };

  const checkBusinessHours = () => {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 17;
  };

  const startCampaignCheck = () => {
    if (selectedIds.size === 0) {
      toast.error('الرجاء تحديد عميل واحد على الأقل.');
      return;
    }
    
    if (!checkBusinessHours()) {
      setShowHoursWarning(true);
    } else {
      executeCampaign();
    }
  };

  const executeCampaign = async () => {
    setShowHoursWarning(false);
    setIsCampaignRunning(true);
    setProgress(0);
    setResults([]);

    const currentList = activeTab === 'bulk' ? leads : dripLeads;
    const selectedList = currentList.filter((l: any) => selectedIds.has(l.id));
    const total = selectedList.length;

    for (let i = 0; i < total; i++) {
      const lead = selectedList[i];
      try {
        if (activeTab === 'bulk') {
          const result = await processCampaignLead(lead);
          setResults(prev => [...prev, { id: lead.id, success: result.success, message: result.message }]);
          if (result.success) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'SENT' });
          }
        } else {
          // Drip execution
          const result = await executeDripLead(lead);
          setResults(prev => [...prev, { id: lead.id, success: result.success, message: result.message }]);
        }
      } catch (e: any) {
        setResults(prev => [...prev, { id: lead.id, success: false, message: e.message }]);
      }

      setProgress(((i + 1) / total) * 100);

      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsCampaignRunning(false);
    toast.success('تم إنهاء إرسال الدفعة الحالية!');
    if (activeTab === 'bulk') {
      await fetchReadyLeads();
    } else {
      await fetchDripLeads();
    }
    setSelectedIds(new Set());
  };

  const currentList = activeTab === 'bulk' ? leads : dripLeads;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Rocket className="w-8 h-8 text-orange-500" />
            الحملات الجماعية
          </h1>
          <p className="text-slate-500 mt-2">محرك الإرسال الذكي لتدفق المبيعات (Smart Bulk Engine)</p>
        </div>
        
        <div className="flex p-1 bg-slate-200/50 rounded-xl">
          <button 
            onClick={() => !isCampaignRunning && setActiveTab('bulk')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'bulk' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            إرسال جديد
          </button>
          <button 
            onClick={() => !isCampaignRunning && setActiveTab('drip')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'drip' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            المتابعات التلقائية
            {dripLeads.length > 0 && activeTab !== 'drip' && (
              <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: List of Leads */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[70vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'bulk' ? `قائمة المستهدفين (${leads.length})` : `متابعات معلقة (${dripLeads.length})`}
            </h2>
            <button 
              onClick={selectAll}
              className="text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg"
            >
              {selectedIds.size === currentList.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <p>
                {activeTab === 'bulk' 
                  ? 'لا يوجد عملاء في قائمة الانتظار حالياً.' 
                  : 'لا توجد متابعات مستحقة اليوم.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {currentList.map((lead: any) => (
                <div 
                  key={lead.id}
                  onClick={() => !isCampaignRunning && toggleSelection(lead.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer
                    ${selectedIds.has(lead.id) ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}
                    ${isCampaignRunning ? 'opacity-50 pointer-events-none' : ''}
                  `}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedIds.has(lead.id) ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'}
                  `}>
                    {selectedIds.has(lead.id) && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{lead.businessName}</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      {activeTab === 'bulk' 
                        ? (lead.status === 'READY_TO_SEND' ? 'جاهز للإرسال (الرسالة مصاغة)' : 'بانتظار الصياغة التلقائية')
                        : `متابعة رقم ${(lead.followUpStage || 0) + 1} - بانتظار تغيير الزاوية التسويقية`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Campaign Orchestrator */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <h2 className="text-xl font-bold text-slate-800 mb-6">لوحة التحكم بالحملة</h2>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600 font-medium">العملاء المحددين:</span>
                <span className="text-xl font-bold text-slate-800">{selectedIds.size}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">الفاصل الزمني المبرمج:</span>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  2 ثانية
                </span>
              </div>
            </div>

            {isCampaignRunning ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                    <span>تقدم الحملة</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                <button 
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 px-6 py-4 rounded-xl font-bold transition-all"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </button>
              </div>
            ) : (
              <button 
                onClick={startCampaignCheck}
                disabled={selectedIds.size === 0 || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeTab === 'bulk' ? <Play className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                {activeTab === 'bulk' ? 'إطلاق الحملة' : 'تشغيل المتابعات الآن'}
              </button>
            )}

            {/* Business Hours Warning Modal */}
            <AnimatePresence>
              {showHoursWarning && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center"
                >
                  <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">تحذير أوقات الدوام</h3>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    الوقت الحالي يقع خارج أوقات العمل الرسمية (9ص - 5م). إرسال رسائل B2B في هذا الوقت قد يقلل من معدلات الفتح بشكل كبير.
                  </p>
                  <div className="w-full space-y-3">
                    <button 
                      onClick={executeCampaign}
                      className="w-full py-3 rounded-xl bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-colors"
                    >
                      تجاوز التحذير وإرسال الآن
                    </button>
                    <button 
                      onClick={() => setShowHoursWarning(false)}
                      className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                      تأجيل الإرسال (إلغاء)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Log Mini-View */}
          {results.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 overflow-y-auto max-h-[35vh]">
              <h3 className="text-lg font-bold text-slate-800 mb-4">سجل الإرسال</h3>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-semibold text-slate-700 truncate w-32" title={r.id}>{r.id}</span>
                    {r.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <span title={r.message} className="shrink-0 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
