"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Reply, User, Calendar, CheckCircle2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'requests' | 'inquiries'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      // Fetch Requests (from the old Trap/Requests page)
      const requestsQ = query(collection(db, 'requests'));
      const reqSnapshot = await getDocs(requestsQ);
      const reqs = reqSnapshot.docs.map(d => ({
        id: d.id,
        type: 'request',
        ...d.data()
      }));

      // Fetch Inquiries (from the old Contact page)
      const inquiriesQ = query(collection(db, 'contact_messages'));
      const inqSnapshot = await getDocs(inquiriesQ);
      const inqs = inqSnapshot.docs.map(d => ({
        id: d.id,
        type: 'inquiry',
        ...d.data()
      }));

      // Merge and sort
      const allMessages = [...reqs, ...inqs].sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setMessages(allMessages);
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error('فشل جلب رسائل صندوق الوارد');
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'requests' && msg.type !== 'request') return false;
    if (filter === 'inquiries' && msg.type !== 'inquiry') return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (msg.customerName?.toLowerCase().includes(term)) ||
        (msg.customerEmail?.toLowerCase().includes(term)) ||
        (msg.customerRequest?.toLowerCase().includes(term)) ||
        (msg.message?.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-indigo-600" />
            صندوق الوارد 📥
          </h1>
          <p className="text-slate-500 mt-2 font-medium">المركز الموحد لجميع استفسارات وطلبات العملاء</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث في الرسائل..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
            />
          </div>
          <div className="flex p-1 bg-slate-200/50 rounded-xl">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilter('requests')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              الطلبات المباشرة
            </button>
            <button 
              onClick={() => setFilter('inquiries')}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${filter === 'inquiries' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              الاستفسارات
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">صندوق الوارد فارغ</h3>
            <p className="text-slate-500 mt-2">لا توجد رسائل مطابقة لخيارات الفلترة الحالية.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            <AnimatePresence>
              {filteredMessages.map((msg, idx) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-6 hover:bg-slate-50 transition-colors group flex gap-6"
                >
                  <div className="shrink-0 pt-1">
                    {msg.type === 'request' ? (
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {msg.customerName || 'عميل مجهول'}
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {msg.type === 'request' ? 'طلب مباشر (AI)' : 'استفسار عام'}
                          </span>
                        </h4>
                        <p className="text-slate-500 text-sm font-medium">
                          {msg.customerEmail || msg.email}
                          {msg.customerPhone && <span className="ml-3 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-xs" dir="ltr">{msg.customerPhone}</span>}
                          {msg.customerNiche && <span className="ml-3 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-xs">المجال: {msg.customerNiche}</span>}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleDateString('ar-SA') : 'تاريخ غير متوفر'}
                        </span>
                        {msg.status === 'COMPLETED' && (
                          <span className="inline-flex mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> تم الرد
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 text-sm text-slate-700 leading-relaxed shadow-sm">
                      {msg.customerRequest || msg.message}
                    </div>

                    {(msg.finalResponse || msg.aiDraftResponse) && (
                      <div className="pr-6 border-r-2 border-indigo-100">
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                          <Reply className="w-4 h-4" />
                          <span className="font-bold text-xs">{msg.status === 'COMPLETED' ? 'الرد المرسل (النهائي)' : 'المسودة المقترحة (الذكاء الاصطناعي)'}</span>
                        </div>
                        <div className="bg-indigo-50/50 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed font-medium">
                          {msg.finalResponse || msg.aiDraftResponse}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
