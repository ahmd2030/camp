"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Building2,
  Briefcase, 
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Loader2,
  Banknote,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { getUsers, UserData } from '@/services/users';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import PendingApprovals from '@/components/ai/PendingApprovals';
import AiCommandInterface from '@/components/ai/AiCommandInterface';

const dummyChartData = [
  { name: 'يناير', income: 4000, expenses: 2400 },
  { name: 'فبراير', income: 3000, expenses: 1398 },
  { name: 'مارس', income: 2000, expenses: 9800 },
  { name: 'أبريل', income: 2780, expenses: 3908 },
  { name: 'مايو', income: 1890, expenses: 4800 },
  { name: 'يونيو', income: 2390, expenses: 3800 },
  { name: 'يوليو', income: 3490, expenses: 4300 },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [clientsCount, setClientsCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [tasksStats, setTasksStats] = useState({ total: 0, completed: 0, completionRate: 0, pending: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [usersData] = await Promise.all([
          getUsers()
        ]);
        setUsersCount(usersData.length);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();

    // استماع لحظي للمهام الذكية من Firestore
    const unsubscribe = onSnapshot(collection(db, 'ai_actions'), (snapshot) => {
      let pending = 0;
      let completed = 0;
      const recent: any[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'pending_approval') pending++;
        else if (data.status === 'completed' || data.status === 'approved') completed++;
        
        recent.push({ id: doc.id, title: data.type?.replace(/_/g, ' ') || 'مهمة', status: data.status === 'pending_approval' ? 'معلقة' : 'مكتملة', ...data });
      });
      
      const total = pending + completed;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      setTasksStats({ total, completed, completionRate, pending });
      setRecentTasks(recent.slice(-5).reverse());
    }, (error) => {
      console.error("Error listening to ai_actions:", error);
    });

    // استماع لحظي للفواتير لحساب إجمالي الأرباح
    const unsubscribeInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      let revenue = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'paid') {
          revenue += Number(data.amount) || 0;
        }
      });
      setTotalRevenue(revenue);
    }, (error) => {
      console.error("Error listening to invoices:", error);
    });

    // استماع لحظي للعملاء لحساب العدد
    const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClientsCount(snapshot.size);
    }, (error) => {
      console.error("Error listening to clients:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeInvoices();
      unsubscribeClients();
    };
  }, []);

  const totalExpenses = tasksStats.total * 0.05;
  const netProfit = totalRevenue - totalExpenses;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { 
      title: 'إجمالي الأرباح', 
      value: `${totalRevenue.toLocaleString()} ريال`, 
      trend: 'أرباح محصلة', 
      isUp: true, 
      icon: Banknote,
      color: 'bg-green-500'
    },
    { 
      title: 'صافي الربح', 
      value: `${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال`, 
      trend: 'الأرباح - المصروفات', 
      isUp: netProfit >= 0, 
      icon: TrendingUp,
      color: netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'
    },
    { 
      title: 'إجمالي العملاء', 
      value: clientsCount.toString(), 
      trend: 'حالي ومحتمل', 
      isUp: true, 
      icon: Building2,
      color: 'bg-indigo-500'
    },
    { 
      title: 'المهام المعلقة', 
      value: tasksStats.pending.toString(), 
      trend: 'تتطلب الانتباه', 
      isUp: false, 
      icon: Clock,
      color: 'bg-yellow-500'
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مرحباً بك في لوحة القيادة</h1>
          <p className="text-gray-500 mt-1">إليك ملخص حي ومباشر لأداء أعمالك مع نظام الوكلاء الذكي.</p>
        </div>
      </div>

      <AiCommandInterface />
      <PendingApprovals />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`flex items-center font-medium text-gray-500`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Chart Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">
            مقارنة الإيرادات والمصروفات (تجريبي)
          </h3>
          
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dummyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="الإيرادات" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="المصروفات" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right List Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-h-[450px] overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4">
            أحدث المهام
          </h3>
          
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مهام حالياً
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                  <div className="mt-0.5">
                    {task.status === 'مكتملة' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${task.status === 'مكتملة' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span className="font-medium text-primary">{task.clientName ? `عميل: ${task.clientName}` : 'مهمة عامة'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
