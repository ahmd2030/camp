"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Mail, 
  MousePointerClick, 
  Eye, 
  Activity, 
  Clock,
  RefreshCcw
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface CampaignRequest {
  id: string;
  customerEmail: string;
  customerRequest: string;
  productName?: string;
  affiliateSignupUrl?: string;
  platform?: string;
  platformUrl?: string;
  status: string;
  opened?: boolean;
  openedAt?: any;
  clicked?: boolean;
  clickedAt?: any;
  sentAt?: any;
  followUpSent?: boolean;
  followUpSentAt?: any;
}

export default function RadarPage() {
  const [data, setData] = useState<CampaignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'requests'),
        where('status', '==', 'COMPLETED')
      );
      // Not using orderBy with where here to avoid Firestore index requirements on the fly.
      // We will sort locally in memory.
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignRequest));
      
      // Sort by latest activity (clickedAt > openedAt > sentAt)
      docs.sort((a, b) => {
        const timeA = (a.clickedAt?.toMillis() || a.openedAt?.toMillis() || a.sentAt?.toMillis() || 0);
        const timeB = (b.clickedAt?.toMillis() || b.openedAt?.toMillis() || b.sentAt?.toMillis() || 0);
        return timeB - timeA;
      });
      
      setData(docs);
    } catch (error) {
      console.error("Failed to fetch radar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalSent = data.length;
  const totalOpened = data.filter(d => d.opened).length;
  const totalClicked = data.filter(d => d.clicked).length;

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0";
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-orange-600" />
            رادار الصيد 🎯
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">تتبع أداء الحملات ونشاط العملاء في الوقت الفعلي</p>
        </div>
        
        <button 
          onClick={fetchData} 
          disabled={isLoading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث الرادار
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">إجمالي الرسائل المرسلة</p>
              <h3 className="text-3xl font-black text-slate-800">{totalSent}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">معدل الفتح (Open Rate)</p>
              <h3 className="text-3xl font-black text-slate-800">{openRate}%</h3>
              <p className="text-xs text-slate-400 mt-1">{totalOpened} رسالة تم فتحها</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">معدل النقر (Click Rate)</p>
              <h3 className="text-3xl font-black text-slate-800">{clickRate}%</h3>
              <p className="text-xs text-slate-400 mt-1">{totalClicked} نقرة مسجلة</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <MousePointerClick className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Feed Table */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            سجل النشاط الحي (Live Feed)
          </h2>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-1">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            مباشر
          </span>
        </div>
        
        <div className="flex-1 overflow-auto max-h-[600px]">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="py-4 px-6 font-bold">العميل</th>
                <th className="py-4 px-6 font-bold">المنصة</th>
                <th className="py-4 px-6 font-bold">الحالة</th>
                <th className="py-4 px-6 font-bold">وقت الفتح</th>
                <th className="py-4 px-6 font-bold">وقت النقر</th>
                <th className="py-4 px-6 font-bold rounded-tl-xl">وقت الإرسال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    لا توجد بيانات تفاعل حتى الآن
                  </td>
                </tr>
              ) : (
                data.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800">{record.customerEmail}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
                        {record.productName || record.platform || 'غير محدد'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2 flex-wrap">
                        {record.clicked ? (
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" /> تم النقر
                          </span>
                        ) : record.opened ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> تم الفتح
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> بانتظار التفاعل
                          </span>
                        )}
                        {record.followUpSent && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <Mail className="w-3 h-3" /> تم إرسال المتابعة
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {record.openedAt ? new Date(record.openedAt.toDate()).toLocaleString('ar-SA') : '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {record.clickedAt ? new Date(record.clickedAt.toDate()).toLocaleString('ar-SA') : '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium text-xs">
                      {record.sentAt ? new Date(record.sentAt.toDate()).toLocaleString('ar-SA') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
