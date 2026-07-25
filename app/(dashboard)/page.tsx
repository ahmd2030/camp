"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send,
  Target,
  Eye,
  Handshake,
  Clock,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [totalSent, setTotalSent] = useState(0);
  const [retargetedCount, setRetargetedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);

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

    // 2. Fetch total count
    const unsubscribeTotal = onSnapshot(collection(db, 'sent_leads'), (snapshot) => {
      setTotalSent(snapshot.size);
      setRetargetedCount(0);
    });

    // 3. Fetch meetings count and recent meetings
    const qMeetings = query(
      collection(db, 'meetings'),
      where('status', '==', 'scheduled'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeMeetings = onSnapshot(qMeetings, (snapshot) => {
      setMeetingsCount(snapshot.size); // Just showing the count of recent or all scheduled depending on query. For total count, normally we'd do a separate query. Since it's limited to 5, we'll do a separate query for count.
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

  const timeAgo = (dateVal: any) => {
    if (!dateVal) return 'غير معروف';
    let date;
    if (typeof dateVal === 'string') {
      date = new Date(dateVal);
    } else if (dateVal?.toDate) {
      date = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      date = dateVal;
    } else {
      date = new Date(dateVal);
    }
    
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
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 p-10 mb-8 shadow-sm"
      >
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            أهلاً بك في مركز قيادة Mango AI
          </h1>
          <p className="text-xl text-white/90">نظرة عامة على أداء حملاتك التسويقية</p>
        </div>
        {/* Abstract shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
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
              <p className="text-slate-500 text-sm font-medium">عمليات إعادة الاستهداف</p>
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
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-center items-center"
        >
          <div className="p-3 bg-orange-50 rounded-xl mb-3">
            <Eye className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">معدل الفتح</p>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-600">قريباً - Coming Soon</span>
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
                      {activity.id.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{activity.id}</h4>
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
