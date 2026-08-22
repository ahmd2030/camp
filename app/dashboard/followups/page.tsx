"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDueFollowups, getStats, processFollowup } from '@/app/actions/followups';
import { Activity, Clock, CheckCircle2, XCircle, Rocket, Mail, Ban, ChevronLeft, Loader2, Sparkles, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function FollowupsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ sentTotal: 0, closedTotal: 0 });
  const [mockTimeJump, setMockTimeJump] = useState(false);

  const fetchFollowups = async () => {
    setLoading(true);
    const [leadsRes, statsRes] = await Promise.all([
      getDueFollowups(mockTimeJump),
      getStats()
    ]);
    if (leadsRes.success) setLeads(leadsRes.leads || []);
    if (statsRes.success) setStats({ sentTotal: statsRes.sentTotal, closedTotal: statsRes.closedTotal });
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowups();
  }, [mockTimeJump]);

  const handleProcessAll = async () => {
    if (leads.length === 0) return;
    setProcessing(true);
    
    let successCount = 0;
    
    // Process sequentially to avoid API rate limits
    for (const lead of leads) {
      toast.loading(`جاري كتابة وإرسال متابعة لـ ${lead.businessName}...`);
      const res = await processFollowup(lead.id, lead);
      toast.dismiss();
      if (res.success) {
        successCount++;
        toast.success(`تمت المتابعة مع ${lead.businessName} ✅`);
        setLeads(prev => prev.filter(l => l.id !== lead.id));
      } else {
        toast.error(`فشل إرسال المتابعة لـ ${lead.businessName}`);
      }
    }
    
    toast.success(`تم الانتهاء! أُرسلت ${successCount} متابعة ذكية.`);
    setProcessing(false);
    fetchFollowups();
  };

  const stage0Leads = leads.filter(l => (l.followUpStage || 0) === 0);
  const stage1Leads = leads.filter(l => (l.followUpStage || 0) === 1);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            المتابعات الذكية <Activity className="w-6 h-6 text-orange-500" />
          </h1>
          <p className="text-slate-500 font-medium mt-1">نظام التذكير الآلي ورسائل الوداع لإغلاق الصفقات</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Developer hidden toggle for testing */}
          <button 
            onClick={() => setMockTimeJump(!mockTimeJump)}
            className={`p-2 rounded-lg border text-xs font-bold transition-all ${mockTimeJump ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
            title="تخطي الوقت (للتجربة)"
          >
            <Clock className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleProcessAll}
            disabled={processing || leads.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
            إطلاق المتابعات 🚀
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">مستحقة للإرسال اليوم</p>
            <h3 className="text-2xl font-black text-slate-800">{leads.length}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">إجمالي المتابعات المرسلة</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.sentTotal}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">ملفات أُغلقت بالوداع</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.closedTotal}</h3>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Follow up 1 */}
          <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                المتابعة الأولى (3 أيام)
              </h2>
              <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                {stage0Leads.length}
              </span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {stage0Leads.length === 0 && (
                  <p className="text-center text-slate-400 py-10 font-medium text-sm border-2 border-dashed border-slate-200 rounded-xl">لا يوجد عملاء مستحقين حالياً</p>
                )}
                {stage0Leads.map((lead) => (
                  <motion.div 
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{lead.businessName}</h3>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md shrink-0">مر 3 أيام</span>
                    </div>
                    <p className="text-slate-500 text-sm truncate">{lead.clientEmail}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 2: Break-up */}
          <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                رسالة الوداع (7 أيام)
              </h2>
              <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                {stage1Leads.length}
              </span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {stage1Leads.length === 0 && (
                  <p className="text-center text-slate-400 py-10 font-medium text-sm border-2 border-dashed border-slate-200 rounded-xl">لا يوجد عملاء مستحقين حالياً</p>
                )}
                {stage1Leads.map((lead) => (
                  <motion.div 
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{lead.businessName}</h3>
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md shrink-0 font-bold">رسالة أخيرة</span>
                    </div>
                    <p className="text-slate-500 text-sm truncate">{lead.clientEmail}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
