"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Calendar, CheckCircle2, Clock, FileText, Loader2, Play, Plus, ServerCog, ShieldCheck, Square, TrendingUp, Users, Briefcase, Zap, Power } from 'lucide-react';
import { createScheduledTask, getScheduledTasks, toggleTaskStatus, getAutonomousReports, ScheduledTask, AutonomousReport } from '@/app/actions/cron';
import { toast, Toaster } from 'sonner';

const TEAM_MEMBERS = [
  { id: 'cmo', title: 'مدير التسويق (CMO)' },
  { id: 'cfo', title: 'المحلل المالي (CFO)' },
  { id: 'cso', title: 'المستشار الاستراتيجي (CSO)' },
  { id: 'cro', title: 'خبير المبيعات (CRO)' },
  { id: 'coo', title: 'مدير النظام (COO/CTO)' }
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [reports, setReports] = useState<AutonomousReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'reports'>('tasks');

  // Form State
  const [agentId, setAgentId] = useState('cmo');
  const [prompt, setPrompt] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [tasksRes, reportsRes] = await Promise.all([
      getScheduledTasks(),
      getAutonomousReports()
    ]);
    if (tasksRes.success) setTasks(tasksRes.tasks || []);
    if (reportsRes.success) setReports(reportsRes.reports || []);
    setIsLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error('الرجاء كتابة تفاصيل المهمة');
      return;
    }

    setIsSubmitting(true);
    const res = await createScheduledTask({ agentId, prompt, frequency, isActive: true });
    if (res.success) {
      toast.success('تمت جدولة المهمة بنجاح!');
      setPrompt('');
      fetchData();
    } else {
      toast.error('حدث خطأ أثناء جدولة المهمة');
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (taskId: string, currentStatus: boolean) => {
    const res = await toggleTaskStatus(taskId, currentStatus);
    if (res.success) {
      toast.success('تم تحديث حالة المهمة');
      fetchData();
    } else {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const getAgentTitle = (id: string) => {
    return TEAM_MEMBERS.find(m => m.id === id)?.title || id;
  };

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'daily') return 'يومياً';
    if (freq === 'weekly') return 'أسبوعياً';
    if (freq === 'monthly') return 'شهرياً';
    return freq;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-indigo-500 fill-indigo-100" />
            المهام الذاتية (Autonomous Tasks)
          </h1>
          <p className="text-slate-500 mt-2 text-lg">حوّل موظفيك إلى عملاء استباقيين يعملون نيابة عنك على مدار الساعة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Task Creation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-indigo-500" />
              مهمة جديدة
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الموظف المنفذ</label>
                <select 
                  value={agentId} 
                  onChange={e => setAgentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer font-medium"
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">التكرار الزمني</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all border ${frequency === freq ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {getFrequencyLabel(freq)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تعليمات المهمة</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="مثال: قم بالبحث في الإنترنت عن أحدث 3 أخبار في مجال الذكاء الاصطناعي ولخصها لي في نقاط..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-medium leading-relaxed shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !prompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                تفعيل المهمة وبدء الجدولة
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Tasks & Reports */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-2 border border-slate-100 flex gap-2 shadow-sm">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-3 text-center rounded-xl font-bold transition-colors ${activeTab === 'tasks' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              المهام المجدولة ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 py-3 text-center rounded-xl font-bold transition-colors ${activeTab === 'reports' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              صندوق الوارد التقارير ({reports.length})
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : activeTab === 'tasks' ? (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-lg">لا توجد مهام مجدولة حالياً</p>
                  <p className="text-sm mt-1">قم بإنشاء مهمتك الأولى من القائمة الجانبية</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:shadow-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                          {getAgentTitle(task.agentId)}
                        </span>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {getFrequencyLabel(task.frequency)}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed">{task.prompt}</p>
                      {task.lastRunTime && (
                        <p className="text-xs text-slate-400 mt-3 font-semibold">
                          آخر تنفيذ: {new Date(task.lastRunTime).toLocaleString('ar-SA')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => handleToggleStatus(task.id!, task.isActive)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${task.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                      >
                        <Power className="w-4 h-4" />
                        {task.isActive ? 'مفعل' : 'موقوف'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-lg">صندوق الوارد فارغ</p>
                  <p className="text-sm mt-1">ستظهر هنا التقارير بمجرد تنفيذ المهام الآلية</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{getAgentTitle(report.agentId)}</p>
                          <p className="text-xs text-slate-500 font-semibold">{new Date(report.createdAt).toLocaleString('ar-SA')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {report.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
