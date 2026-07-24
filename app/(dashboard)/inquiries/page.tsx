"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Mail, Clock, CheckCircle2, AlertCircle, Bot, X, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { processInquiryAutonomous } from '@/app/actions/inquiries';

interface Inquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  inquiryText: string;
  status: string;
  createdAt: any;
  aiResponse?: string;
  respondedAt?: string;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Modal state
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Inquiry[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Inquiry);
      });
      setInquiries(fetched);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching inquiries", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleProcessInquiry = async (inquiry: Inquiry) => {
    if (processingId) return;
    setProcessingId(inquiry.id);
    toast.info('جاري إطلاق منظومة الرد الذكي والتأكد من الجودة...');
    
    try {
      // تحديث الحالة إلى جاري المعالجة
      await updateDoc(doc(db, 'inquiries', inquiry.id), { status: 'جاري المعالجة ⏳' });
      
      const result = await processInquiryAutonomous(inquiry.id, inquiry.clientName, inquiry.inquiryText);
      
      if (result.success) {
        toast.success('تمت صياغة الرد واعتماده وإرساله للعميل بنجاح!');
        setSelectedInquiry(null);
      } else {
        toast.error(`خطأ: ${result.error}`);
        // إرجاع الحالة
        await updateDoc(doc(db, 'inquiries', inquiry.id), { status: 'جديد' });
      }
    } catch (error) {
      toast.error('حدث خطأ في النظام');
    } finally {
      setProcessingId(null);
    }
  };

  // وظيفة وهمية لإضافة استفسار تجريبي لتسهيل تجربة المدير
  const addDummyInquiry = async () => {
    try {
      await addDoc(collection(db, 'inquiries'), {
        clientName: "أحمد اليزيدي",
        clientEmail: "ahmd@example.com",
        inquiryText: "مرحباً، لقد رأيت رسالتكم التسويقية بخصوص خدماتكم. هل يمكنكم تزويدي بتفاصيل إضافية حول كيفية مساعدتكم لشركات البرمجة في زيادة مبيعاتها؟ شكراً.",
        status: "جديد",
        createdAt: new Date()
      });
      toast.success('تمت إضافة استفسار تجريبي!');
    } catch (e) {
      toast.error('فشل إضافة الاستفسار');
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-orange-500" />
            استفسارات العملاء
          </h1>
          <p className="text-slate-500 mt-2">نظام الردود الذكي مع مدقق الجودة الآلي</p>
        </div>
        <button 
          onClick={addDummyInquiry}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          + استفسار تجريبي
        </button>
      </div>

      {/* Inquiries List */}
      {inquiries.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">صندوق الوارد فارغ</h3>
          <p className="text-slate-500 max-w-md">لا توجد استفسارات جديدة في الوقت الحالي. الذكاء الاصطناعي في وضع الاستعداد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {inquiries.map((inquiry) => (
              <motion.div 
                key={inquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedInquiry(inquiry)}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{inquiry.clientName}</h3>
                    <span className="text-sm font-mono text-slate-400">{inquiry.clientEmail}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2 leading-relaxed">{inquiry.inquiryText}</p>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-sm font-medium">
                    {inquiry.status.includes('بنجاح') || inquiry.status === 'تم إغلاق الصفقة' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-4 h-4" />
                        {inquiry.status}
                      </span>
                    ) : inquiry.status.includes('جاري') ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {inquiry.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <AlertCircle className="w-4 h-4" />
                        {inquiry.status}
                      </span>
                    )}
                  </div>
                  <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
                    <Bot className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 sticky top-0">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedInquiry.clientName}</h2>
                  <p className="text-slate-500 text-sm mt-1">{selectedInquiry.clientEmail}</p>
                </div>
                <button 
                  onClick={() => setSelectedInquiry(null)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                {/* Client Message */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
                    <Mail className="w-4 h-4 text-orange-500" />
                    الرسالة الواردة:
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed text-lg shadow-inner">
                    {selectedInquiry.inquiryText}
                  </div>
                </div>

                {/* AI Response if exists */}
                {selectedInquiry.aiResponse && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
                      <Bot className="w-4 h-4 text-green-600" />
                      الرد الآلي (تم الاعتماد من المدقق):
                    </div>
                    <div className="p-5 rounded-2xl bg-green-50/50 border border-green-100 text-slate-800 leading-relaxed text-lg whitespace-pre-wrap">
                      {selectedInquiry.aiResponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedInquiry(null)}
                  className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
                >
                  إغلاق
                </button>
                
                {(!selectedInquiry.status.includes('بنجاح') && selectedInquiry.status !== 'جاري المعالجة ⏳') && (
                  <button 
                    onClick={() => handleProcessInquiry(selectedInquiry)}
                    disabled={processingId === selectedInquiry.id}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === selectedInquiry.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        المولد والمدقق يعملان...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        تشغيل منظومة الرد الذكي
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
