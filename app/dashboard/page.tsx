"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
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
  Rocket,
  Link as LinkIcon,
  User,
  MessageSquare,
  Bot,
  Trash2,
  Info,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
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

  // Pending Tasks State
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<{ title: string, content: string } | null>(null);

  // Autopilot State
  // Autopilot State
  const [autopilotState, setAutopilotState] = useState<'IDLE' | 'HUNTING' | 'FILTERING' | 'SCRAPING' | 'SENDING' | 'DONE' | 'ERROR' | 'MASS_RUNNING'>('IDLE');
  const [autopilotMessage, setAutopilotMessage] = useState('جاهز للانطلاق');
  const [autopilotProgress, setAutopilotProgress] = useState(0);
  const [massTargetCount, setMassTargetCount] = useState(1);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [customProductInput, setCustomProductInput] = useState('');

  useEffect(() => {
    // Fetch dashboard stats (sort locally to avoid index errors)
    const q = query(collection(db, 'sent_leads'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recent: any[] = [];
      snapshot.forEach(doc => {
        recent.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally
      recent.sort((a, b) => {
        const tA = a.sentAt?.toMillis ? a.sentAt.toMillis() : 0;
        const tB = b.sentAt?.toMillis ? b.sentAt.toMillis() : 0;
        return tB - tA;
      });
      setRecentActivity(recent.slice(0, 5));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sent_leads:", error);
      setLoading(false);
    });

    // Fetch Pending Requests (remove orderBy to avoid Firebase index error, sort locally)
    const qPending = query(collection(db, 'requests'), where('status', '==', 'PENDING_AFFILIATE'));
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally by createdAt desc
      fetched.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setPendingRequests(fetched);
    }, (error) => {
      console.error("Error fetching pending requests:", error);
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
      where('status', '==', 'scheduled')
    );
    const unsubscribeMeetings = onSnapshot(qMeetings, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      fetched.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setRecentMeetings(fetched.slice(0, 5));
    }, (error) => {
      console.error("Error fetching meetings:", error);
    });

    const qMeetingsTotal = query(collection(db, 'meetings'), where('status', '==', 'scheduled'));
    const unsubscribeMeetingsTotal = onSnapshot(qMeetingsTotal, (snapshot) => {
      setMeetingsCount(snapshot.size);
    });

    // Listen to active mass campaign if any
    let unsubscribeCampaign: any = null;
    if (activeCampaignId) {
      unsubscribeCampaign = onSnapshot(doc(db, 'mass_campaigns', activeCampaignId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAutopilotMessage(data.message);
          
          if (data.totalRequested > 0) {
            setAutopilotProgress(Math.floor((data.processed / data.totalRequested) * 100));
          }

          if (data.status === 'COMPLETED') {
            setAutopilotState('DONE');
            toast.success('تم الانتهاء من الحملة الجماعية!');
            setActiveCampaignId(null);
          } else if (data.status === 'ERROR') {
            setAutopilotState('ERROR');
            toast.error('حدث خطأ في الحملة الجماعية');
            setActiveCampaignId(null);
          }
        }
      });
    }

    return () => {
      unsubscribe();
      unsubscribePending();
      unsubscribeTotal();
      unsubscribeMeetings();
      unsubscribeMeetingsTotal();
      if (unsubscribeCampaign) unsubscribeCampaign();
    };
  }, [activeCampaignId]);

  const runAutopilot = async () => {
    setAutopilotState('HUNTING');
    setAutopilotProgress(10);
    setAutopilotMessage('استدعاء الذكاء الاصطناعي لتحديد أفضل مجال مستهدف...');

    try {
      // 1. CHOOSE NICHE
      let targetNiche;
      if (customProductInput.trim() !== '') {
        const { analyzeCustomProduct } = await import('@/app/actions/analyst');
        const res = await analyzeCustomProduct(customProductInput);
        if (!res.success || !res.niche) {
          throw new Error(res.error || 'فشل في تحليل المنتج المخصص.');
        }
        targetNiche = res.niche;
      } else {
        const res = await getAndFillNiches();
        if (!res.success || !res.niches || res.niches.length === 0) {
          throw new Error(res.error || 'فشل في تحديد المجال.');
        }
        targetNiche = res.niches[0];
      }
      setAutopilotProgress(30);
      setAutopilotState('FILTERING');
      setAutopilotMessage(`جاري تقييم الجانب الشرعي والربحي لمجال: ${targetNiche.title}...`);

      // 2. CHECK COMPLIANCE
      const authResult = await analyzeNichesPortfolio([targetNiche]);
      if (!authResult.success) {
        throw new Error(authResult.error || 'فشل في فحص الأمان الشرعي.');
      }
      if (authResult.rejectedCount > 0) {
        throw new Error(`تم إقصاء المجال (${targetNiche.title}) لعدم توافقه مع الضوابط الشرعية.`);
      }
      setAutopilotProgress(50);

      // 3. START MASS CAMPAIGN API
      setAutopilotState('MASS_RUNNING');
      setAutopilotMessage(`تم إرسال المهمة للصاروخ الخلفي لاصطياد ${massTargetCount} عميل... 🚀`);
      
      const apiRes = await fetch('/api/mass-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: targetNiche.searchQuery,
          targetCount: massTargetCount,
          customProduct: customProductInput.trim() !== '' ? customProductInput : null
        })
      });

      const apiData = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(apiData.error || 'فشل إطلاق الحملة الجماعية');
      }

      toast.success('تم انطلاق الحملة الجماعية بنجاح في الخلفية!');
      setActiveCampaignId(apiData.campaignId);

    } catch (e: any) {
      setAutopilotState('ERROR');
      setAutopilotMessage(e.message || 'حدث خطأ غير متوقع في الطيار الآلي.');
      toast.error('توقف الطيار الآلي');
    }
  };

  const handleLinkChange = (id: string, value: string) => {
    setAffiliateLinks(prev => ({ ...prev, [id]: value }));
  };

  const handleApproveAndSend = async (req: any) => {
    const link = affiliateLinks[req.id];
    
    if (!link || link.trim() === '') {
      toast.error('يرجى إدخال رابط العمولة أولاً');
      return;
    }

    setProcessingId(req.id);
    
    try {
      const finalEmailContent = req.aiDraftResponse.replace(/\[INSERT_AFFILIATE_LINK_HERE\]/g, link);
      
      const response = await fetch('/api/send-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: req.id,
          customerEmail: req.customerEmail,
          finalEmailContent: finalEmailContent,
          affiliateLink: link,
          productName: req.productName || '',
          platformName: req.platform || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الاتصال بالخادم');
      }

      toast.success('تم إرسال الإيميل بنجاح واختفت المهمة!');
      
      setAffiliateLinks(prev => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
      
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'حدث خطأ أثناء اعتماد الطلب وإرساله');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await deleteDoc(doc(db, 'requests', id));
      toast.success('تم حذف الطلب بنجاح');
      // The onSnapshot listener will automatically remove it from the list
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error('حدث خطأ أثناء الحذف');
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
          
          <div className="mb-6 relative">
            <input 
              type="text" 
              value={customProductInput}
              onChange={(e) => setCustomProductInput(e.target.value)}
              disabled={!['IDLE', 'DONE', 'ERROR'].includes(autopilotState)}
              placeholder="لديك منتج؟ الصق الرابط هنا مع وصف بسيط (مثال: برنامج محاسبة للمطاعم https://...)" 
              className="w-full pl-4 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all font-medium text-slate-700 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">العدد:</span>
              <select 
                value={massTargetCount}
                onChange={(e) => setMassTargetCount(Number(e.target.value))}
                disabled={!['IDLE', 'DONE', 'ERROR'].includes(autopilotState)}
                className="bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-bold shadow-sm cursor-pointer"
              >
                <option value={1}>1 عميل (للتجربة)</option>
                <option value={5}>5 عملاء</option>
                <option value={10}>10 عملاء</option>
                <option value={20}>20 عميل</option>
                <option value={50}>50 عميل (Mass)</option>
                <option value={100}>100 عميل (Max)</option>
              </select>
            </div>
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

      {/* Quick Test Email Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-xl">
            <Send className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">تجربة النظام (Test)</h3>
            <p className="text-sm text-slate-500">أرسل رسالة تجريبية لإيميلك الشخصي لتتأكد من عمل الدومين الجديد</p>
          </div>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <input 
            type="email" 
            id="testEmailInput"
            placeholder="أدخل إيميلك الشخصي هنا..." 
            className="flex-1 sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button 
            onClick={async () => {
              const email = (document.getElementById('testEmailInput') as HTMLInputElement).value;
              if (!email) {
                toast.error('يرجى إدخال الإيميل أولاً');
                return;
              }
              const toastId = toast.loading('جاري الإرسال...');
              try {
                const res = await fetch('/api/test-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('تم إرسال الرسالة التجريبية بنجاح! راجع صندوق الوارد الخاص بك.', { id: toastId });
                } else {
                  toast.error(data.error || 'فشل الإرسال', { id: toastId });
                }
              } catch (e) {
                toast.error('حدث خطأ في الاتصال', { id: toastId });
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            إرسال التجربة
          </button>
        </div>
      </motion.div>

      {/* Pending Tasks Section */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-indigo-500" />
            <h2 className="text-2xl font-bold text-slate-800">مهام قيد الانتظار (روابط مطلوبة)</h2>
            <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm font-bold">
              {pendingRequests.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {pendingRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:border-indigo-200 transition-colors"
                >
                  <div className="p-5 flex-1 relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 font-mono text-xs text-indigo-600 bg-indigo-50 w-fit px-2 py-1 rounded-full">
                        <User className="w-3 h-3" />
                        {req.customerEmail}
                      </div>
                      <button 
                        onClick={() => handleDeleteRequest(req.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                        title="حذف هذه المهمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-slate-700 text-sm font-medium line-clamp-3 mb-4">
                      {req.customerRequest}
                    </p>
                    
                    {(req.productName || req.platform) && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">📦</span>
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            المنتج المحدد: <span className="text-indigo-600">{req.productName || req.platform}</span>
                            {(req.strategyGuide || req.productName) && (
                              <button 
                                onClick={() => setSelectedGuide({ title: `دليل ترويج: ${req.productName || req.platform}`, content: req.strategyGuide || 'لا يوجد شرح متوفر حالياً.' })}
                                className="p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                                title="عرض تفاصيل وشرح استراتيجية المنتج"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            )}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">🔗</span>
                          <span className="font-bold text-slate-800 text-sm">
                            بوابة التسجيل: <a href={req.affiliateSignupUrl || req.platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline underline-offset-4 decoration-amber-300 hover:decoration-amber-500 transition-colors cursor-pointer">انقر هنا للتسجيل كمسوق</a>
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <input 
                        type="url" 
                        value={affiliateLinks[req.id] || ''}
                        onChange={(e) => handleLinkChange(req.id, e.target.value)}
                        placeholder="الصق رابط الإحالة هنا..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-left font-mono" 
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button 
                      onClick={() => handleApproveAndSend(req)}
                      disabled={processingId === req.id}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      إقلاع 🚀
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

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

      {/* Info Modal */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-500" />
                  {selectedGuide.title}
                </h3>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedGuide.content}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  حسناً، فهمت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
