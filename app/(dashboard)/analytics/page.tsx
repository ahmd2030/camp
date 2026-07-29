"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, Activity, Clock, ShieldCheck, TrendingUp, Users, ServerCog, Briefcase, RefreshCcw, Bot } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ROLES: Record<string, { title: string, color: string, icon: any }> = {
  'cmo': { title: 'التسويق (CMO)', color: '#f97316', icon: <TrendingUp className="w-4 h-4" /> }, // orange-500
  'cfo': { title: 'المالية (CFO)', color: '#3b82f6', icon: <Briefcase className="w-4 h-4" /> }, // blue-500
  'cso': { title: 'الاستراتيجية (CSO)', color: '#22c55e', icon: <ShieldCheck className="w-4 h-4" /> }, // green-500
  'cro': { title: 'المبيعات (CRO)', color: '#a855f7', icon: <Users className="w-4 h-4" /> }, // purple-500
  'coo': { title: 'النظام (COO)', color: '#64748b', icon: <ServerCog className="w-4 h-4" /> } // slate-500
};

interface UsageRecord {
  id: string;
  roleId: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  timestamp: any;
}

export default function AnalyticsPage() {
  const [usageData, setUsageData] = useState<UsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // OpEx Fund
  const [profitInput, setProfitInput] = useState('');
  const [totalOpex, setTotalOpex] = useState(0);
  const [totalNetProfit, setTotalNetProfit] = useState(0);
  const [isSavingProfit, setIsSavingProfit] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'api_usage'), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageRecord));
      setUsageData(data);

      const r = query(collection(db, 'revenue_records'));
      const revSnap = await getDocs(r);
      let opex = 0;
      let net = 0;
      revSnap.forEach(doc => {
        opex += doc.data().opex || 0;
        net += doc.data().netProfit || 0;
      });
      setTotalOpex(opex);
      setTotalNetProfit(net);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfit = async () => {
    const profit = parseFloat(profitInput);
    if (isNaN(profit) || profit <= 0) return;
    setIsSavingProfit(true);
    try {
      const opex = profit * 0.2;
      const netProfit = profit * 0.8;
      await addDoc(collection(db, 'revenue_records'), {
        totalProfit: profit,
        opex,
        netProfit,
        timestamp: serverTimestamp()
      });
      setProfitInput('');
      fetchData();
      const { toast } = await import('sonner');
      toast.success('تم تسجيل الأرباح وتوزيع الميزانية بنجاح!');
    } catch (error) {
      console.error("Error saving profit:", error);
    } finally {
      setIsSavingProfit(false);
    }
  };

  // Aggregations
  const totalCost = usageData.reduce((acc, curr) => acc + curr.cost, 0);
  const totalPromptTokens = usageData.reduce((acc, curr) => acc + curr.prompt_tokens, 0);
  const totalCompletionTokens = usageData.reduce((acc, curr) => acc + curr.completion_tokens, 0);
  
  // Cost per Role for Pie Chart
  const costPerRoleMap: Record<string, number> = {};
  usageData.forEach(record => {
    const role = record.roleId || 'unknown';
    costPerRoleMap[role] = (costPerRoleMap[role] || 0) + record.cost;
  });

  const pieData = Object.keys(costPerRoleMap).map(role => ({
    name: ROLES[role]?.title || role,
    value: costPerRoleMap[role],
    color: ROLES[role]?.color || '#94a3b8'
  })).sort((a, b) => b.value - a.value);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            الرادار المالي
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">مراقبة لحظية لاستهلاك الذكاء الاصطناعي والتكاليف التشغيلية (GPT-4o-mini)</p>
        </div>
        
        <button 
          onClick={fetchData} 
          disabled={isLoading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">إجمالي التكلفة (Total Spend)</p>
              <h3 className="text-3xl font-black text-slate-800">${totalCost.toFixed(5)}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">توكنز الإدخال (Prompt)</p>
              <h3 className="text-3xl font-black text-slate-800">{formatNumber(totalPromptTokens)}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">توكنز الإخراج (Completion)</p>
              <h3 className="text-3xl font-black text-slate-800">{formatNumber(totalCompletionTokens)}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cost Per Agent */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            التكلفة لكل قسم
          </h2>
          
          <div className="h-[250px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`$${Number(value).toFixed(5)}`, 'التكلفة']}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                لا توجد بيانات استهلاك كافية
              </div>
            )}
          </div>

          <div className="space-y-3 mt-4">
            {pieData.map((data, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: data.color }}></div>
                  <span className="font-semibold text-slate-700">{data.name}</span>
                </div>
                <span className="font-bold text-slate-900">${data.value.toFixed(5)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions Table */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              سجل العمليات الأخيرة
            </h2>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">أحدث العمليات</span>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="py-4 px-6 font-bold">القسم (Agent)</th>
                  <th className="py-4 px-6 font-bold">الزمن</th>
                  <th className="py-4 px-6 font-bold">الإدخال</th>
                  <th className="py-4 px-6 font-bold">الإخراج</th>
                  <th className="py-4 px-6 font-bold rounded-tl-xl">التكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-4 px-6">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : usageData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                      <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      لا يوجد أي عمليات حتى الآن
                    </td>
                  </tr>
                ) : (
                  usageData.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm`} style={{ backgroundColor: ROLES[record.roleId]?.color || '#94a3b8' }}>
                            {ROLES[record.roleId]?.icon || <Bot className="w-4 h-4" />}
                          </div>
                          <span className="font-bold text-slate-700">{ROLES[record.roleId]?.title || record.roleId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-slate-500 font-medium">
                        {record.timestamp ? new Date(record.timestamp.toDate()).toLocaleString('ar-SA') : 'الآن'}
                      </td>
                      <td className="py-3 px-6 text-slate-600 font-medium">{formatNumber(record.prompt_tokens)}</td>
                      <td className="py-3 px-6 text-slate-600 font-medium">{formatNumber(record.completion_tokens)}</td>
                      <td className="py-3 px-6 font-black text-slate-800">${record.cost.toFixed(5)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* OpEx Fund Section */}
      <div className="mt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4 w-full">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bot className="w-6 h-6 text-indigo-500" />
              صندوق التشغيل والتطوير (OpEx Fund)
            </h2>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              قم بتسجيل أرباحك الواردة من منصات الإحالة. سيقوم النظام تلقائياً بتخصيص 20% لتغطية تكاليف التشغيل (APIs والاستضافة) لضمان استمرارية عمل الآلة، وتحويل 80% كصافي أرباح لك.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute right-4 top-2.5 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={profitInput}
                  onChange={e => setProfitInput(e.target.value)}
                  placeholder="أدخل مبلغ الأرباح المستلمة" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-left font-bold" 
                  dir="ltr"
                />
              </div>
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleSaveProfit}
                disabled={isSavingProfit || !profitInput}
              >
                تسجيل الأرباح
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px] text-center flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-500 mb-1">صندوق النظام (20%)</span>
              <span className="text-2xl font-black text-indigo-600">${totalOpex.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 min-w-[140px] text-center flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-emerald-600 mb-1">صافي الأرباح (80%)</span>
              <span className="text-2xl font-black text-emerald-600">${totalNetProfit.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
