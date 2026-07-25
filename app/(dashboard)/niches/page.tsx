"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAndFillNiches } from '@/app/actions/analyst';
import { automateScraping } from '@/app/actions/scraper';
import { updateNicheStatus, getAllNiches, SuggestedNiche } from '@/services/niches';
import { analyzeNichesPortfolio } from '@/app/actions/masterAgent';
import { Sparkles, Loader2, Target, Briefcase, Zap, XCircle, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function NichesPage() {
  const [niches, setNiches] = useState<SuggestedNiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [automating, setAutomating] = useState<string | null>(null);
  
  // Master Agent State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategyReport, setStrategyReport] = useState<string | null>(null);

  useEffect(() => {
    fetchNiches();
  }, []);

  const fetchNiches = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAllNiches();
      if (result.success && result.data) {
        setNiches(result.data);
        // If empty, autofill
        if (result.data.length === 0) {
          await getAndFillNiches();
          const refresh = await getAllNiches();
          if (refresh.success && refresh.data) {
            setNiches(refresh.data);
          }
        }
      } else {
        setError(result.error || 'حدث خطأ غير متوقع');
      }
    } catch (e: any) {
      setError(e.message || String(e) || 'فشل الاتصال بالخادم.');
    }
    setLoading(false);
  };

  const handleApproveAndAutomate = async (niche: SuggestedNiche) => {
    if (!niche.id) return;
    
    // Update local state temporarily
    setNiches(prev => prev.map(n => n.id === niche.id ? { ...n, status: 'APPROVED' } : n));
    setAutomating(niche.title);
    toast.info(`تم تفويض العمل الآلي: ${niche.title}...`);

    await updateNicheStatus(niche.id, 'APPROVED');

    automateScraping(niche.searchQuery)
      .then((res) => {
        if (res.success) {
          toast.success(`اكتمل الصيد لـ ${niche.title}! الأهداف جاهزة.`);
        } else {
          toast.error(`فشل الصيد لـ ${niche.title}: ${(res as any).error || 'حدث خطأ'}`);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(`تعطل العمل الآلي لـ ${niche.title}.`);
      })
      .finally(() => {
        setAutomating(null);
      });
  };

  const handleReject = async (niche: SuggestedNiche) => {
    if (!niche.id) return;
    setNiches(prev => prev.map(n => n.id === niche.id ? { ...n, status: 'REJECTED' } : n));
    await updateNicheStatus(niche.id, 'REJECTED');
    toast.success(`تم استبعاد مجال: ${niche.title}`);
  };

  const runMasterAgent = async () => {
    setIsAnalyzing(true);
    setStrategyReport(null);
    toast.info('جاري تفعيل مدير التسويق الاستراتيجي...', { duration: 4000 });
    
    try {
      // Pass all active and approved niches to the master agent
      const targetNiches = niches.filter(n => n.status !== 'REJECTED');
      const result = await analyzeNichesPortfolio(targetNiches);
      
      if (result.success) {
        setStrategyReport(result.report);
        if (result.rejectedCount > 0) {
          toast.warning(`تم رفض ${result.rejectedCount} مجالات لمخالفتها الضوابط الشرعية والأخلاقية!`);
          // Refresh list to update rejected status
          await fetchNiches();
        } else {
          toast.success('تم إنشاء التقرير الاستراتيجي بنجاح!');
        }
      } else {
        toast.error('فشل المدير الاستراتيجي: ' + result.error);
      }
    } catch (e: any) {
      toast.error('حدث خطأ أثناء الاتصال بالمدير الاستراتيجي.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-orange-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">يتم جلب البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-6 bg-red-50 text-red-600 rounded-xl text-center">
          <p className="font-bold text-lg mb-2">تعذر تحليل المجالات</p>
          <p>{error}</p>
          <button 
            onClick={fetchNiches}
            className="mt-4 px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-orange-500" />
            إدارة المجالات (Niches)
          </h1>
          <p className="text-slate-500 mt-2">نظام صيد وتطوير المجالات المستهدفة</p>
        </div>

        <button 
          onClick={runMasterAgent}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-3 disabled:opacity-70 disabled:cursor-wait"
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <BrainCircuit className="w-5 h-5 text-orange-400" />
          )}
          فحص استراتيجي شامل (Master Agent)
        </button>
      </div>

      <AnimatePresence>
        {strategyReport && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-8 border border-orange-100 shadow-sm relative">
              <button 
                onClick={() => setStrategyReport(null)}
                className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">التقرير الاستراتيجي (Master Agent)</h2>
                  <p className="text-sm text-slate-500">تم التوليد بناءً على تقييم المجالات والضوابط الأخلاقية</p>
                </div>
              </div>

              <div className="prose prose-slate prose-orange max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                {strategyReport}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {niches.map((niche) => (
            <motion.div
              key={niche.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`bg-white border rounded-3xl p-6 shadow-sm transition-all relative overflow-hidden group
                ${niche.status === 'APPROVED' ? 'border-orange-200' : 'border-slate-100 hover:border-slate-200'}
                ${niche.status === 'REJECTED' ? 'opacity-60 grayscale' : ''}
              `}
            >
              {niche.status === 'APPROVED' && (
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${niche.status === 'APPROVED' ? 'bg-orange-50' : 'bg-slate-50'}`}>
                    <Briefcase className={`w-6 h-6 ${niche.status === 'APPROVED' ? 'text-orange-500' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{niche.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {niche.status === 'ACTIVE' && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">مكتشف حديثاً</span>}
                      {niche.status === 'APPROVED' && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">معتمد / قيد العمل</span>}
                      {niche.status === 'REJECTED' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">مرفوض</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">السبب الاستراتيجي</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{niche.justification}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">العمولة المتوقعة</p>
                    <p className="text-slate-800 font-bold">{niche.expectedCommission}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">نقطة الألم الحادة</p>
                    <p className="text-slate-800 font-bold truncate" title={niche.painPoint}>{niche.painPoint}</p>
                  </div>
                </div>
              </div>

              {niche.status === 'ACTIVE' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveAndAutomate(niche)}
                    disabled={automating === niche.title}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70"
                  >
                    {automating === niche.title ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                    بدء الصيد
                  </button>
                  <button
                    onClick={() => handleReject(niche)}
                    className="p-3 bg-white border-2 border-slate-100 hover:bg-red-50 hover:border-red-100 hover:text-red-600 text-slate-400 rounded-xl transition-all"
                    title="استبعاد"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              )}
              {niche.status === 'APPROVED' && automating === niche.title && (
                <div className="w-full bg-orange-50 text-orange-600 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري جلب العملاء...
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
