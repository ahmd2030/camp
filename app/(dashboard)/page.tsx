"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send,
  Target,
  Eye,
  Handshake,
  Clock,
  Loader2,
  CalendarDays,
  PlaneTakeoff,
  ShieldCheck,
  Search,
  Rocket
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, where, updateDoc, doc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

// Actions for Autopilot
import { getAndFillNiches } from '@/app/actions/analyst';
import { analyzeNichesPortfolio } from '@/app/actions/masterAgent';
import { automateScraping } from '@/app/actions/scraper';
import { processCampaignLead } from '@/app/actions/campaigns';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [totalSent, setTotalSent] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [retargetedCount, setRetargetedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);

  // Autopilot State
  const [autopilotState, setAutopilotState] = useState<'IDLE' | 'HUNTING' | 'FILTERING' | 'SCRAPING' | 'SENDING' | 'DONE' | 'ERROR'>('IDLE');
  const [autopilotMessage, setAutopilotMessage] = useState('جاهز للانطلاق');
  const [autopilotProgress, setAutopilotProgress] = useState(0);

  useEffect(() => {
    // Fetch dashboard stats
    const q = query(collection(db, 'sent_leads'), orderBy('sentAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recent: any[] = [];
      snapshot.forEach(doc => {
        recent.push({ id: doc.id, ...doc.data() });
      });
      setRecentActivity(recent);
      setLoading(false);
    });

    const unsubscribeTotal = onSnapshot(collection(db, 'sent_leads'), (snapshot) => {
      setTotalSent(snapshot.size);
      let retargeted = 0;
      let opened = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.followUpStage && data.followUpStage > 1) {
          retargeted++;
        }
        if (data.opened) {
          opened++;
        }
      });
      setRetargetedCount(retargeted);
      setOpenCount(opened);
    });

    const qMeetings = query(
      collection(db, 'meetings'),
      where('status', '==', 'scheduled'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeMeetings = onSnapshot(qMeetings, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setRecentMeetings(fetched);
    });

    const qMeetingsTotal = query(collection(db, 'meetings'), where('status', '==', 'scheduled'));
    const unsubscribeMeetingsTotal = onSnapshot(qMeetingsTotal, (snapshot) => {
      setMeetingsCount(snapshot.size);
    });

    return () => {
      unsubscribe();
      unsubscribeTotal();
      unsubscribeMeetings();
      unsubscribeMeetingsTotal();
    };
  }, []);

  const runAutopilot = async () => {
    if (autopilotState !== 'IDLE' && autopilotState !== 'DONE' && autopilotState !== 'ERROR') return;
    
    setAutopilotState('HUNTING');
    setAutopilotMessage('جاري الصيد والبحث عن مجال جديد... ⏳');
    setAutopilotProgress(10);

    try {
      // 1. HUNTING
      const nichesResult = await getAndFillNiches();
      if (!nichesResult.success || !nichesResult.niches || nichesResult.niches.length === 0) {
        throw new Error('فشل العثور على مجالات جديدة.');
      }
      // Pick the first one
      const targetNiche = nichesResult.niches[0];
      setAutopilotProgress(30);

      // 2. FILTERING
      setAutopilotState('FILTERING');
      setAutopilotMessage(`جاري الفلترة الشرعية لمجال: ${targetNiche.title}... 🛡️`);
      const authResult = await analyzeNichesPortfolio([targetNiche]);
      
      if (!authResult.success) {
        throw new Error('فشل في فحص الأمان الشرعي.');
      }
      if (authResult.rejectedCount > 0) {
        throw new Error(`تم إقصاء المجال (${targetNiche.title}) لعدم توافقه مع الضوابط الشرعية.`);
      }
      setAutopilotProgress(50);

      // 3. SCRAPING
      setAutopilotState('SCRAPING');
      setAutopilotMessage(`جاري جلب 5 عملاء في مجال: ${targetNiche.title}... 🎣`);
      const scrapeResult = await automateScraping(targetNiche.searchQuery, 5);
      
      if (!scrapeResult.success || !scrapeResult.leads || scrapeResult.leads.length === 0) {
        throw new Error('لم نتمكن من جلب عملاء لهذا المجال.');
      }
      setAutopilotProgress(75);

      // 4. SENDING
      setAutopilotState('SENDING');
      const leadsToProcess = scrapeResult.leads;
      let sentCount = 0;
      
      for (let i = 0; i < leadsToProcess.length; i++) {
        const lead = leadsToProcess[i];
        setAutopilotMessage(`جاري الإرسال (${i + 1}/${leadsToProcess.length}) للعميل: ${lead.businessName}... 🚀`);
        
        try {
          const res = await processCampaignLead(lead);
          if (res.success && lead.id) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'SENT' });
            sentCount++;
          }
        } catch (err) {
          console.warn('Failed to send to', lead.businessName);
        }
        
        // 2 seconds rate limit
        if (i < leadsToProcess.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      setAutopilotProgress(100);
      setAutopilotState('DONE');
      setAutopilotMessage(`تم إرسال ${sentCount} رسائل تسويقية بنجاح للمجال المعتمد! 🎉`);
      toast.success('اكتملت دورة الطيار الآلي بنجاح!');

    } catch (e: any) {
      setAutopilotState('ERROR');
      setAutopilotMessage(e.message || 'حدث خطأ غير متوقع في الطيار الآلي.');
      toast.error('توقف الطيار الآلي');
    }
  };

  const timeAgo = (dateVal: any) => {
    if (!dateVal) return 'غير معروف';
    let date = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(date.getTime())) return 'غير معروف';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " سنة";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " شهر";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " يوم";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " ساعة";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " دقيقة";
    return Math.floor(seconds) + " ثانية";
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Hero Banner with Autopilot */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-white border-2 border-orange-100 p-8 mb-8 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8"
      >
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            الطيار الآلي الموحد (Unified Autopilot)
          </h1>
          <p className="text-lg text-slate-600 mb-6">دع الذكاء الاصطناعي يبحث، يفلتر شرعياً، يجمع العملاء، ويرسل الحملات نيابة عنك.</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={runAutopilot}
              disabled={!['IDLE', 'DONE', 'ERROR'].includes(autopilotState)}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              {!['IDLE', 'DONE', 'ERROR'].includes(autopilotState) ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <PlaneTakeoff className="w-6 h-6" />
              )}
              تشغيل الطيار الآلي
            </button>
            
            <div className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
              {!['IDLE', 'DONE', 'ERROR'].includes(autopilotState) && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-orange-50 transition-all duration-500 ease-out" 
                  style={{ width: `${autopilotProgress}%` }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                {autopilotState === 'HUNTING' && <Search className="w-5 h-5 text-orange-500 animate-pulse" />}
                {autopilotState === 'FILTERING' && <ShieldCheck className="w-5 h-5 text-green-500 animate-pulse" />}
                {autopilotState === 'SCRAPING' && <Target className="w-5 h-5 text-blue-500 animate-pulse" />}
                {autopilotState === 'SENDING' && <Rocket className="w-5 h-5 text-purple-500 animate-bounce" />}
                <p className="font-semibold text-slate-700">{autopilotMessage}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex w-64 h-64 relative items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-amber-50 rounded-full animate-pulse" />
          <PlaneTakeoff className="w-32 h-32 text-orange-400 relative z-10 opacity-80" />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">إجمالي المراسلات</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-800">{totalSent}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Send className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">عمليات المتابعة (Drip)</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-800">{retargetedCount}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Target className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-center items-center group"
        >
          <div className="p-3 bg-orange-50 rounded-xl mb-3">
            <Eye className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">معدل الفتح</p>
          <h3 className="text-3xl font-bold mt-1 text-slate-800">
            {totalSent > 0 ? Math.round((openCount / totalSent) * 100) : 0}%
          </h3>
          <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">الاجتماعات المجدولة</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-800">{meetingsCount}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Handshake className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-sm lg:col-span-1"
        >
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-slate-800">آخر النشاطات</h2>
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              لا توجد نشاطات مسجلة حتى الآن.
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex justify-between items-center p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                      {activity.businessName ? activity.businessName.charAt(0).toUpperCase() : activity.id.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{activity.businessName || activity.id}</h4>
                      <p className="text-sm text-slate-500 mt-1">تم إرسال رسالة تسويقية ذكية ✉️</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    منذ {timeAgo(activity.sentAt)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Meetings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-3xl p-8 shadow-sm lg:col-span-1"
        >
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-slate-800">أحدث المواعيد المحجوزة</h2>
          </div>
          
          {recentMeetings.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              لا توجد مواعيد مجدولة حالياً.
            </div>
          ) : (
            <div className="space-y-4">
              {recentMeetings.map((meeting, index) => {
                const meetingDate = new Date(meeting.meetingDate);
                return (
                  <motion.div 
                    key={meeting.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{meeting.clientName}</h4>
                        <p className="text-sm text-slate-500 font-mono mt-0.5">{meeting.clientEmail}</p>
                      </div>
                      <div className="text-xs font-bold px-3 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
                        قادم
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <Clock className="w-4 h-4 text-orange-400" />
                      {meetingDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' })} - {meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
