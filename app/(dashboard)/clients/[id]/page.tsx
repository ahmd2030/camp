"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { User, FileText, CheckCircle, Clock, Loader2, Sparkles } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProfilePage({ params }: PageProps) {
  const { id } = React.use(params);
  
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClient() {
      if (!id) return;
      const clientRef = doc(db, 'clients', id);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        setClient({ id: clientSnap.id, ...clientSnap.data() });
      }
    }

    fetchClient();

    // Fetch Client Invoices
    const qInvoices = query(
      collection(db, 'invoices'), 
      where('clientId', '==', id)
    );
    
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      // Sort manually client side to avoid needing composite indexes immediately
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setInvoices(data);
    });

    // Fetch Client Tasks
    const qTasks = query(
      collection(db, 'ai_actions'),
      where('clientId', '==', id)
    );

    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTasks(data);
    });

    setLoading(false);

    return () => {
      unsubInvoices();
      unsubTasks();
    };
  }, [id]);

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <div className="text-gray-500 mt-1 flex gap-4 text-sm">
            <span>{client.email || 'لا يوجد بريد إلكتروني'}</span>
            <span>{client.phone || 'لا يوجد رقم هاتف'}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {client.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <FileText className="w-5 h-5 text-gray-500" />
            فواتير العميل
          </h3>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لا توجد فواتير مسجلة</p>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{inv.description}</p>
                    <p className="text-sm text-gray-500">{inv.amount} ريال</p>
                  </div>
                  {inv.status === 'paid' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
                      <CheckCircle className="w-4 h-4" /> مدفوعة
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium bg-yellow-50 px-2 py-1 rounded">
                      <Clock className="w-4 h-4" /> معلقة
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Sparkles className="w-5 h-5 text-gray-500" />
            مهام الذكاء الاصطناعي
          </h3>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لا توجد مهام مسجلة</p>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{task.aiReasoning || task.type}</p>
                    <p className="text-xs text-gray-500 mt-1">توجيه إلى: {task.context?.routedModel || 'Default'}</p>
                  </div>
                  {task.status === 'completed' || task.status === 'approved' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
                      <CheckCircle className="w-4 h-4" /> منجزة
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium bg-yellow-50 px-2 py-1 rounded">
                      <Clock className="w-4 h-4" /> {task.status === 'pending_approval' ? 'بانتظار الموافقة' : task.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
