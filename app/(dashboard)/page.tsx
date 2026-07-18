"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2,
  Briefcase, 
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Loader2,
  Banknote
} from 'lucide-react';

import { getClients, ClientData } from '@/services/clients';
import { getUsers, UserData } from '@/services/users';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import PendingApprovals from '@/components/ai/PendingApprovals';
import AiCommandInterface from '@/components/ai/AiCommandInterface';

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
        
        recent.push({ id: doc.id, title: data.type.replace(/_/g, ' '), status: data.status === 'pending_approval' ? 'معلقة' : 'مكتملة', ...data });
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
    { 
      title: 'معدل الإنجاز', 
      value: `${tasksStats.completionRate}%`, 
      trend: 'أداء المهام', 
      isUp: true, 
      icon: CheckCircle2,
      color: 'bg-green-500'
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مرحباً بك في لوحة القيادة</h1>
          <p className="text-gray-500 mt-1">إليك ملخص حي ومباشر لأداء أعمالك.</p>
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
            مستوى إنجاز المهام العام
          </h3>
          
          <div className="space-y-8 mt-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-gray-700">نسبة الإنجاز ({tasksStats.completionRate}%)</span>
              <span className="text-sm text-gray-500">{tasksStats.completed} من أصل {tasksStats.total} مهمة مكتملة</span>
            </div>
            
            {/* Progress Bar Track */}
            <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner flex">
              {/* Completed Bar */}
              <div 
                className="h-full bg-gradient-to-l from-green-400 to-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${tasksStats.completionRate}%` }}
              ></div>
              {/* Pending space is inherently the remaining gray area */}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-50">
              <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3 border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">مهام مكتملة</p>
                  <p className="text-xl font-bold text-gray-900">{tasksStats.completed}</p>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg flex items-center gap-3 border border-yellow-100">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">مهام قيد العمل / معلقة</p>
                  <p className="text-xl font-bold text-gray-900">{tasksStats.pending}</p>
                </div>
              </div>
            </div>
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
                      <span className="font-medium text-primary">{task.assignedTo}</span>
                      {task.clientName && <span>• لعميل: {task.clientName}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
