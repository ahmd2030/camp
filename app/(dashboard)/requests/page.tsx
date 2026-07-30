"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Mail, MessageSquare, Send, Link as LinkIcon, Loader2, Bot, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { executeEmailAction } from '@/app/actions/email';

interface AffiliateRequest {
  id: string;
  customerEmail: string;
  customerRequest: string;
  aiDraftResponse: string;
  status: string;
  createdAt: any;
}

export default function AdminInboxPage() {
  const [requests, setRequests] = useState<AffiliateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [affiliateLinks, setAffiliateLinks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // جلب الطلبات التي تنتظر إضافة رابط العمولة
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'PENDING_AFFILIATE'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: AffiliateRequest[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as AffiliateRequest);
      });
      setRequests(fetched);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching requests", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLinkChange = (id: string, value: string) => {
    setAffiliateLinks(prev => ({ ...prev, [id]: value }));
  };

  const handleApproveAndSend = async (req: AffiliateRequest) => {
    const link = affiliateLinks[req.id];
    
    if (!link || link.trim() === '') {
      toast.error('يرجى إدخال رابط العمولة أولاً');
      return;
    }

    setProcessingId(req.id);
    
    try {
      // استبدال الـ Placeholder بالرابط الفعلي
      const finalEmailContent = req.aiDraftResponse.replace(/\[INSERT_AFFILIATE_LINK_HERE\]/g, link);
      
      const response = await fetch('/api/send-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: req.id,
          customerEmail: req.customerEmail,
          finalEmailContent: finalEmailContent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الاتصال بالخادم');
      }

      toast.success('تم إرسال الإيميل بنجاح!');
      
      // مسح الرابط من الحالة
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

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Mail className="w-8 h-8 text-indigo-600" />
          صندوق الوارد الإداري (المصيدة)
        </h1>
        <p className="text-slate-500 mt-2">
          راجع مسودات الذكاء الاصطناعي، ضع رابط العمولة، واعتمد الإرسال.
        </p>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">الصندوق فارغ</h3>
          <p className="text-slate-500 max-w-md">لا توجد طلبات معلقة حالياً. كل شيء على ما يرام!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {requests.map((req) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col"
              >
                {/* Card Header (Customer Request) */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-mono text-sm text-indigo-600 bg-indigo-50 w-fit px-3 py-1 rounded-full">
                    <User className="w-4 h-4" />
                    {req.customerEmail}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      طلب العميل الأساسي:
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm bg-white p-4 rounded-xl border border-slate-100 shadow-inner">
                      {req.customerRequest}
                    </p>
                  </div>
                </div>

                {/* Card Body (AI Draft) */}
                <div className="p-6 flex flex-col gap-3">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-emerald-500" />
                    مسودة الذكاء الاصطناعي التسويقية:
                  </h4>
                  <div className="text-slate-700 leading-relaxed text-sm bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 whitespace-pre-wrap">
                    {/* التلوين البصري لمكان الرابط لكي يبرز للمدير */}
                    {req.aiDraftResponse.split('[INSERT_AFFILIATE_LINK_HERE]').map((part, index, array) => (
                      <React.Fragment key={index}>
                        {part}
                        {index !== array.length - 1 && (
                          <span className="inline-flex items-center gap-1 bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-bold mx-1 animate-pulse border border-yellow-300 shadow-sm">
                            <LinkIcon className="w-3 h-3" />
                            [مكان رابط العمولة]
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Card Footer (Action Area) */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <input 
                      type="url" 
                      value={affiliateLinks[req.id] || ''}
                      onChange={(e) => handleLinkChange(req.id, e.target.value)}
                      placeholder="أدخل رابط العمولة الخاص بك هنا (Affiliate Link)..." 
                      className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-left font-mono" 
                      dir="ltr"
                    />
                  </div>
                  
                  <button 
                    onClick={() => handleApproveAndSend(req)}
                    disabled={processingId === req.id}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {processingId === req.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    اعتماد وإرسال
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
