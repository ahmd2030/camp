"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyzeNiches, NicheSuggestion } from '@/app/actions/analyst';
import { automateScraping } from '@/app/actions/scraper';
import { Sparkles, Loader2, Target, Briefcase, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NichesPage() {
  const [niches, setNiches] = useState<NicheSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [automating, setAutomating] = useState<string | null>(null); // To track which niche is automating
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    fetchNiches();
  }, []);

  const fetchNiches = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyzeNiches();
      if (result.success && result.niches) {
        setNiches(result.niches);
      } else {
        setError(result.error || 'حدث خطأ غير متوقع');
      }
    } catch (e: any) {
      setError('فشل الاتصال بالخادم.');
    }
    setLoading(false);
  };

  const handleApproveAndAutomate = async (niche: NicheSuggestion) => {
    setAutomating(niche.title);
    toast.info(`تم بدء العمل الآلي على: ${niche.title}... جاري الصيد في الخلفية.`);
    
    // We do not await here strictly to simulate background fire-and-forget for UI responsiveness,
    // but we can also just let it run. However, Server Actions return promises.
    automateScraping(niche.searchQuery)
      .then((res) => {
        if (res.success) {
          toast.success(`اكتمل الصيد لـ ${niche.title}! تم جمع الأهداف بنجاح وهي جاهزة للإرسال.`);
          setCompleted((prev) => [...prev, niche.title]);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-primary">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-gray-600 font-medium animate-pulse">يقوم وكيل الذكاء الاصطناعي الآن بتحليل السوق واختيار أفضل المجالات الموسمية...</p>
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
            المجالات الساخنة (Niches)
          </h1>
          <p className="text-gray-500 mt-1">دراسات جدوى تلقائية لأفضل القطاعات الموسمية التي يمكنك استهدافها الآن.</p>
        </div>
        <button 
          onClick={fetchNiches}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> إعادة التحليل
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {niches.map((niche, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
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
            
            <div className="p-4 bg-gray-50">
              {completed.includes(niche.title) ? (
                <div className="w-full py-3 px-4 bg-green-100 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-200">
                  <CheckCircle2 className="w-5 h-5" />
                  اكتمل الصيد والأتمتة
                </div>
              ) : (
                <button
                  onClick={() => handleApproveAndAutomate(niche)}
                  disabled={automating !== null}
                  className={`w-full py-3 px-4 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-all ${
                    automating === niche.title 
                      ? 'bg-orange-500 text-white animate-pulse' 
                      : automating !== null 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-md'
                  }`}
                >
                  {automating === niche.title ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الصيد في الخلفية...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      موافقة وتفويض العمل الآلي
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
