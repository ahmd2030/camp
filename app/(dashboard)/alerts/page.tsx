"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { AlertTriangle, Activity, CheckCircle2, ServerCrash, Eye, Clock, Terminal } from 'lucide-react';
import { toast } from 'sonner';

interface SystemAlert {
  id: string;
  technicalError: string;
  aiMessage: string;
  status: 'UNREAD' | 'READ';
  timestamp: any;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب التنبيهات من الأحدث للأقدم
    const q = query(
      collection(db, 'system_alerts'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: SystemAlert[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as SystemAlert);
      });
      setAlerts(fetched);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching alerts", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'system_alerts', id), {
        status: 'READ'
      });
      toast.success('تمت قراءة التنبيه وإرشفته');
    } catch (error) {
      console.error('Error updating alert status:', error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const unreadCount = alerts.filter(a => a.status === 'UNREAD').length;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Activity className="w-10 h-10 animate-pulse text-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-rose-600" />
            نظام المراقبة الذاتية (AI Monitor)
          </h1>
          <p className="text-slate-500 mt-2">
            متابعة الأخطاء التقنية لحظة بلحظة مع تحليل فوري من المدير التقني (AI).
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="bg-rose-100 text-rose-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            {unreadCount} تنبيهات غير مقروءة
          </div>
        )}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">النظام مستقر تماماً</h3>
          <p className="text-slate-500 max-w-md">لا توجد أية أخطاء أو تنبيهات مسجلة في الوقت الحالي.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${
                  alert.status === 'UNREAD' ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-100 opacity-75'
                }`}
              >
                {/* AI Explanation (The main focus for the manager) */}
                <div className={`p-6 border-b ${alert.status === 'UNREAD' ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold flex items-center gap-2 text-rose-700">
                      <ServerCrash className="w-5 h-5" />
                      توضيح المدير التقني (AI)
                    </h4>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp?.toDate().toLocaleString('ar-SA') || 'الآن'}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-lg bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    {alert.aiMessage}
                  </p>
                </div>

                {/* Technical Details */}
                <div className="p-6 bg-slate-900 text-slate-300">
                  <h4 className="font-bold flex items-center gap-2 text-slate-400 mb-2 text-sm">
                    <Terminal className="w-4 h-4" />
                    الخطأ التقني الفعلي (للمبرمجين):
                  </h4>
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-rose-200">
                    {alert.technicalError}
                  </pre>
                </div>

                {/* Actions */}
                {alert.status === 'UNREAD' && (
                  <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      تمت القراءة
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
