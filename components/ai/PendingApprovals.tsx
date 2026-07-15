"use client";

import { useState, useEffect } from 'react';
import { AiAction } from '@/types/ai';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { approveAction, rejectAction } from '@/services/aiActionService';

export default function PendingApprovals() {
  const [pendingTasks, setPendingTasks] = useState<AiAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // جلب المهام المعلقة في الوقت الفعلي (Real-time)
    const q = query(
      collection(db, 'ai_actions'),
      where('status', '==', 'pending_approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: AiAction[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as AiAction);
      });
      setPendingTasks(tasks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pending approvals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    await approveAction(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    await rejectAction(id);
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100 mt-6 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (pendingTasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100 mt-6">
        <div className="flex justify-center mb-4">
          <div className="bg-green-50 p-4 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800">لا توجد مهام معلقة</h3>
        <p className="text-gray-500 mt-2">الذكاء الاصطناعي لا ينتظر موافقتك على أي إجراء حالياً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          قرارات بانتظار الاعتماد (HITL)
        </h2>
        <span className="bg-orange-100 text-orange-700 text-sm font-semibold px-3 py-1 rounded-full">
          {pendingTasks.length} مهام معلقة
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pendingTasks.map((task) => (
          <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400"></div>
            
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-gray-800 capitalize">
                {task.type.replace(/_/g, ' ')}
              </h3>
              <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md" dir="ltr">
                ${task.costEstimate.toFixed(2)}
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-6 flex-grow leading-relaxed">
              {task.aiReasoning}
            </p>
            
            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => handleApprove(task.id!)}
                disabled={processingId === task.id}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                {processingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                اعتماد
              </button>
              <button 
                onClick={() => handleReject(task.id!)}
                disabled={processingId === task.id}
                className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-medium py-2.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                {processingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
