"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAndFillNiches } from '@/app/actions/analyst';
import { automateScraping } from '@/app/actions/scraper';
import { updateNicheStatus, SuggestedNiche } from '@/services/niches';
import { Sparkles, Loader2, Target, Briefcase, Zap, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NichesPage() {
  const [niches, setNiches] = useState<SuggestedNiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [automating, setAutomating] = useState<string | null>(null);

  useEffect(() => {
    fetchAndFillNiches();
  }, []);

  const fetchAndFillNiches = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const result = await getAndFillNiches();
      if (result.success && result.niches) {
        setNiches(result.niches);
      } else {
        if (!isBackground) setError(result.error || 'حدث خطأ غير متوقع');
        else toast.error(result.error || 'فشل في تعبئة الخزان بمجالات جديدة');
      }
    } catch (e: any) {
      if (!isBackground) setError(e.message || String(e) || 'فشل الاتصال بالخادم.');
    }
    if (!isBackground) setLoading(false);
  };

  const handleApproveAndAutomate = async (niche: SuggestedNiche) => {
    if (!niche.id) return;
    
    // 1. Remove from UI immediately for snappy feeling
    setNiches(prev => prev.filter(n => n.id !== niche.id));
    setAutomating(niche.title);
    toast.info(`تم تفويض العمل الآلي: ${niche.title}...`);

    // 2. Update DB status
    await updateNicheStatus(niche.id, 'APPROVED');

    // 3. Trigger Scraper
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

    // 4. Background autofill
    fetchAndFillNiches(true);
  };

  const handleReject = async (niche: SuggestedNiche) => {
    if (!niche.id) return;
    
    // 1. Remove from UI immediately
    setNiches(prev => prev.filter(n => n.id !== niche.id));
    
    // 2. Update DB
    await updateNicheStatus(niche.id, 'REJECTED');
    toast.success(`تم استبعاد مجال: ${niche.title}`);
    
    // 3. Background autofill
    fetchAndFillNiches(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-primary">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-gray-600 font-medium animate-pulse">يتم الآن سحب وتحليل أفضل المجالات الموسمية لتعزيز خزان الصيد...</p>
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
            onClick={() => fetchAndFillNiches()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            المجالات الساخنة (خزان مستمر)
          </h1>
          <p className="text-gray-500 mt-1">يضمن النظام توفير 10 أهداف نشطة دائماً. وافق أو استبعد ليتم التعويض تلقائياً.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-100 shadow-sm">
            الرصيد النشط: {niches.length} / 10
          </div>
          <button 
            onClick={() => fetchAndFillNiches()}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> فحص وتعبئة
          </button>
        </div>
      </div>

      {niches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد مجالات نشطة حالياً. جاري التعبئة في الخلفية أو قم بالتحديث.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {niches.map((niche) => (
            <motion.div 
              key={niche.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white flex-1">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{niche.title}</h3>
                
                <div className="space-y-4 mt-6">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">المبرر الموسمي</span>
                    <p className="text-sm text-gray-700 font-medium">{niche.justification}</p>
                  </div>
                  
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">نقطة الألم للتاجر</span>
                    <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100">{niche.painPoint}</p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">العمولة المتوقعة</span>
                    <p className="text-sm text-green-700 font-bold flex items-center gap-1">
                      <Target className="w-4 h-4" /> {niche.expectedCommission}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => handleApproveAndAutomate(niche)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-700 text-white hover:shadow-md"
                >
                  <Zap className="w-5 h-5" />
                  موافقة
                </button>
                <button
                  onClick={() => handleReject(niche)}
                  className="py-3 px-4 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-all bg-white border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  title="استبعاد"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
