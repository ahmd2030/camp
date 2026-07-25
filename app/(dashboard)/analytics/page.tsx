"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart3, TrendingUp, Users, Target, Mail, Handshake, Loader2, ArrowDown } from 'lucide-react';
import { 
  Funnel, 
  FunnelChart, 
  Tooltip as RechartsTooltip, 
  LabelList, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    sentLeads: 0,
    inquiries: 0,
    meetings: 0
  });

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 4) setLoading(false);
    };

    const unsubLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
      setMetrics(prev => ({ ...prev, totalLeads: snapshot.size }));
      checkLoaded();
    });
    
    const unsubSent = onSnapshot(collection(db, 'sent_leads'), (snapshot) => {
      setMetrics(prev => ({ ...prev, sentLeads: snapshot.size }));
      checkLoaded();
    });

    const unsubInquiries = onSnapshot(collection(db, 'inquiries'), (snapshot) => {
      setMetrics(prev => ({ ...prev, inquiries: snapshot.size }));
      checkLoaded();
    });

    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      setMetrics(prev => ({ ...prev, meetings: snapshot.size }));
      checkLoaded();
    });

    return () => {
      unsubLeads();
      unsubSent();
      unsubInquiries();
      unsubMeetings();
    };
  }, []);

  const funnelData = [
    { name: 'إجمالي المستهدفين', value: metrics.totalLeads, fill: '#f1f5f9', stroke: '#cbd5e1' }, // slate-100
    { name: 'المراسلات المرسلة', value: metrics.sentLeads, fill: '#fed7aa', stroke: '#fdba74' }, // orange-200
    { name: 'الاستفسارات الواردة', value: metrics.inquiries, fill: '#fb923c', stroke: '#f97316' }, // orange-400
    { name: 'الاجتماعات المجدولة', value: metrics.meetings, fill: '#ea580c', stroke: '#c2410c' } // orange-600
  ];

  // Calculate Conversion Rates
  const sentRate = metrics.totalLeads > 0 ? Math.round((metrics.sentLeads / metrics.totalLeads) * 100) : 0;
  const inquiryRate = metrics.sentLeads > 0 ? Math.round((metrics.inquiries / metrics.sentLeads) * 100) : 0;
  const meetingRate = metrics.inquiries > 0 ? Math.round((metrics.meetings / metrics.inquiries) * 100) : 0;
  const totalConversion = metrics.totalLeads > 0 ? ((metrics.meetings / metrics.totalLeads) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center -m-8">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-orange-500" />
          لوحة التحليلات المتقدمة
        </h1>
        <p className="text-slate-500">نظرة شاملة على قمع المبيعات ومعدلات التحويل (Conversion Funnel)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Funnel Chart Section */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              قمع المبيعات (Sales Funnel)
            </h2>
            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold border border-orange-100">
              معدل التحويل الكلي: {totalConversion}%
            </div>
          </div>

          <div className="h-[400px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <RechartsTooltip 
                  formatter={(value) => [`${value} عميل`, 'العدد']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Funnel
                  dataKey="value"
                  data={funnelData}
                  isAnimationActive
                >
                  <LabelList 
                    position="right" 
                    fill="#475569" 
                    stroke="none" 
                    dataKey="name" 
                    className="font-bold text-sm"
                  />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke} strokeWidth={2} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion Metrics Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-800 mb-2">مراحل التحويل</h2>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="font-semibold">المستهدفين</span>
              </div>
              <span className="text-2xl font-bold text-slate-800">{metrics.totalLeads}</span>
            </div>
            <p className="text-xs text-slate-400">إجمالي العملاء المجموعين</p>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-100 shadow-sm flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              {sentRate}% وصول
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Target className="w-5 h-5 text-orange-400" />
                <span className="font-semibold">تمت المراسلة</span>
              </div>
              <span className="text-2xl font-bold text-slate-800">{metrics.sentLeads}</span>
            </div>
            <p className="text-xs text-slate-400">حملات أرسلت بنجاح</p>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-100 shadow-sm flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              {inquiryRate}% استجابة
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">استفسارات</span>
              </div>
              <span className="text-2xl font-bold text-slate-800">{metrics.inquiries}</span>
            </div>
            <p className="text-xs text-slate-400">ردود وعمليات تفاعل</p>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-100 shadow-sm flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              {meetingRate}% حجز
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 shadow-md border border-orange-400 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-white/90">
                <Handshake className="w-5 h-5" />
                <span className="font-semibold">اجتماعات</span>
              </div>
              <span className="text-2xl font-bold text-white">{metrics.meetings}</span>
            </div>
            <p className="text-xs text-white/70">صفقات واجتماعات مجدولة</p>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
