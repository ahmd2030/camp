"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Target, Loader2, Star, MessageSquare, Copy, Check, Eye, CheckCircle2, TrendingUp, Filter, AlertCircle, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { scrapeGooglePlaces } from '@/app/actions/scraper';
import { sendTestEmail } from '@/app/actions/sendEmail';

interface Lead {
  id: string;
  businessName: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  website: string;
  painPoint: string;
  aiPitch: string;
  status: string;
  createdAt: any;
}

export default function ScraperPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Lead[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setLeads(data);
      setLoading(false);
    }, (error) => {
      console.warn("Index missing, falling back to simple query", error);
      const simpleQ = collection(db, 'leads');
      onSnapshot(simpleQ, (snap) => {
        const data: Lead[] = [];
        snap.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Lead);
        });
        data.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setLeads(data);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  const handleScrapeGooglePlaces = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('الرجاء إدخال كلمة بحث أولاً');
      return;
    }

    setIsScraping(true);
    
    try {
      const result = await scrapeGooglePlaces(searchQuery);
      if (result.success) {
        toast.success(`تم الانتهاء من الصيد! تمت إضافة ${result.count} أهداف بنجاح.`);
      } else {
        toast.error(result.error || 'حدث خطأ أثناء الصيد');
      }
    } catch (error) {
      toast.error('فشل الاتصال بالخادم.');
    }

    setIsScraping(false);
    setSearchQuery(""); // مسح الحقل بعد البحث
  };

  const handleLaunchCampaign = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/send');
      const data = await response.json();
      if (data.success) {
        if (data.sent === 0 && data.failed === 0) {
          toast.info(data.message || 'لا توجد أهداف جاهزة للإرسال حالياً.');
        } else {
          toast.success(`تم إطلاق الحملة! نجاح: ${data.sent}، فشل: ${data.failed}`);
        }
      } else {
        toast.error(data.error || 'حدث خطأ أثناء الإرسال');
      }
    } catch (error) {
      toast.error('فشل الاتصال بخادم الإرسال');
    }
    setIsSending(false);
  };

  const handleOpenPitch = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCopyAndMarkSent = async (lead: Lead) => {
    // 1. نسخ النص
    const affiliateUrl = "https://affiliate.link/referral_123";
    const textToCopy = lead.aiPitch.replace("[LINK]", affiliateUrl).replace("[رابط الإحالة]", affiliateUrl);
    navigator.clipboard.writeText(textToCopy);
    toast.success('تم نسخ الرسالة مع رابط الإحالة!');

    // 2. تحديث الحالة
    if (lead.status === 'PENDING') {
      try {
        const leadRef = doc(db, 'leads', lead.id);
        await updateDoc(leadRef, { status: 'PITCH_SENT' });
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
    
    setIsModalOpen(false);
  };

  const handleSendTestEmail = async () => {
    if (!selectedLead || !selectedLead.aiPitch) return;
    setIsTestingEmail(true);
    try {
      const result = await sendTestEmail(selectedLead.aiPitch);
      if (result.success) {
        toast.success('تم الإرسال التجريبي بنجاح عبر Mango AI 🚀');
      } else {
        toast.error(`فشل الإرسال: ${result.error}`);
      }
    } catch (error: any) {
      toast.error('فشل الاتصال بالخادم للإرسال التجريبي');
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 min-h-[calc(100vh-2rem)] bg-gradient-to-br from-gray-50 to-gray-200 p-2 md:p-6 rounded-3xl"
    >
      {/* الترويسة الزجاجية */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white/40 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            Mango AI <span className="text-gray-400 font-light">Radar</span> 🥭
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">وضع المختبر التجريبي - واجهة الصيد الذكي (متصل بالواقع)</p>
        </div>
        <button
          onClick={handleLaunchCampaign}
          disabled={isSending}
          className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          إطلاق حملة الإيميلات 🚀
        </button>
      </div>

      <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/60">
        <form onSubmit={handleScrapeGooglePlaces} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث هنا... (مثال: Plumbers in Dallas، أو شركات تكييف في الدمام)"
              className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
              disabled={isScraping}
            />
          </div>
          <button
            type="submit"
            disabled={isScraping || !searchQuery.trim()}
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg shadow hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
          >
            {isScraping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Filter className="w-5 h-5" />}
            تفعيل رادار الخرائط
          </button>
        </form>
      </div>

      {/* الجدول بتأثير Glassmorphism */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
        {leads.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">لم يتم اصطياد أي أهداف بعد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-200/50 text-gray-700 font-semibold">
                  <th className="p-5 text-right">المحل (الهدف)</th>
                  <th className="p-5 text-right">التقييم</th>
                  <th className="p-5 text-right">نقطة الألم (Pain Point)</th>
                  <th className="p-5 text-right">تاريخ الرصد</th>
                  <th className="p-5 text-right">الحالة</th>
                  <th className="p-5 text-right">الإجراء السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/80 transition-colors duration-300">
                    <td className="p-5">
                      <div className="font-bold text-gray-800">{lead.businessName}</div>
                      <div className="text-sm text-gray-500 font-mono mt-1">{lead.phone || lead.website || lead.email || "بدون تواصل"}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-1 ${lead.rating < 4.0 ? 'bg-red-100/80 text-red-700 border border-red-200' : 'bg-green-100/80 text-green-700 border border-green-200'}`}>
                          <Star className="w-4 h-4 fill-current" />
                          {lead.rating}
                        </span>
                        <span className="text-xs font-normal text-gray-500 mr-2">({lead.reviewsCount})</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700">{lead.painPoint}</span>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-gray-500 font-medium">
                      {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}
                    </td>
                    <td className="p-4">
                      {lead.status === 'PITCH_SENT' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تم الإرسال
                        </span>
                      ) : lead.status === 'CONVERTED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          <TrendingUp className="w-3.5 h-3.5" />
                          اقتنصنا الهدف
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <MessageSquare className="w-3.5 h-3.5" />
                          قيد الانتظار
                        </span>
                      )}
                    </td>
                    <td className="p-5">
                      <button 
                        onClick={() => handleOpenPitch(lead)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        عرض الرسالة 🤖
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pitch Modal */}
      <AnimatePresence>
        {isModalOpen && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  الرسالة المخصصة للهدف
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 bg-gray-50 max-h-[60vh] overflow-y-auto">
                <div className="mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">نقطة الألم المستهدفة</span>
                  <p className="mt-1 text-sm font-medium text-red-600">{selectedLead.painPoint}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">النص المقترح (AI)</span>
                  <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedLead.aiPitch}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSendTestEmail}
                  disabled={isTestingEmail}
                  className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-900 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال تجريبي عبر Mango AI 🚀
                </button>
                <button
                  onClick={() => handleCopyAndMarkSent(selectedLead)}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  نسخ وتحديد كمُرسل
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
