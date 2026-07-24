"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send,
  Target,
  Eye,
  Handshake,
  Clock,
  Loader2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [totalSent, setTotalSent] = useState(0);
  const [retargetedCount, setRetargetedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch total sent and recent activity from sent_leads
    const q = query(collection(db, 'sent_leads'), orderBy('sentAt', 'desc'), limit(5));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recent: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        recent.push({ id: doc.id, ...data });
      });
      setRecentActivity(recent);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching recent activity", error);
      setLoading(false);
    });

    // 2. Fetch total count (using a simple onSnapshot for now, or just a separate query)
    const unsubscribeTotal = onSnapshot(collection(db, 'sent_leads'), (snapshot) => {
      setTotalSent(snapshot.size);
      // For retargeted count, we can just hardcode 0 for now as requested
      setRetargetedCount(0);
    });

    return () => {
      unsubscribe();
      unsubscribeTotal();
    };
  }, []);

  const timeAgo = (dateString: string) => {
    if (!dateString) return 'غير معروف';
    const date = new Date(dateString);
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
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans -m-8" dir="rtl">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-white/10 p-10 mb-8 backdrop-blur-md"
      >
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            أهلاً بك في مركز قيادة Mango AI
          </h1>
          <p className="text-xl text-gray-300">نظرة عامة على أداء حملاتك التسويقية</p>
        </div>
        {/* Abstract shapes for glassmorphism */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:bg-white/10 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">إجمالي المراسلات</p>
              <h3 className="text-3xl font-bold mt-1 text-white">{totalSent}</h3>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Send className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:bg-white/10 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">عمليات إعادة الاستهداف</p>
              <h3 className="text-3xl font-bold mt-1 text-white">{retargetedCount}</h3>
            </div>
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Target className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-center items-center"
        >
          <div className="p-3 bg-blue-500/20 rounded-xl mb-3">
            <Eye className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">معدل الفتح</p>
          <span className="text-xs font-bold px-3 py-1 bg-white/10 rounded-full text-gray-300 border border-white/10">قريباً - Coming Soon</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-center items-center"
        >
          <div className="p-3 bg-purple-500/20 rounded-xl mb-3">
            <Handshake className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">الاجتماعات المجدولة</p>
          <span className="text-xs font-bold px-3 py-1 bg-white/10 rounded-full text-gray-300 border border-white/10">قريباً - Coming Soon</span>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold">آخر النشاطات</h2>
        </div>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
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
                className="flex justify-between items-center p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {activity.id.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-200">{activity.id}</h4>
                    <p className="text-sm text-gray-400 mt-1">تم إرسال رسالة تسويقية ذكية ✉️</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-400 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-sm">
                  منذ {timeAgo(activity.sentAt)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
