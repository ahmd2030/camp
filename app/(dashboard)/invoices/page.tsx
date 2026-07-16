"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FileText, Loader2, CheckCircle, Clock, Check } from 'lucide-react';

interface Invoice {
  id: string;
  description: string;
  amount: number;
  status: string;
  createdAt: any;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handlePayment = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        console.error('Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    // جلب الفواتير مع ترتيبها (أحدث الفواتير أولاً إن أمكن)
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Invoice[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      // Fallback if index is missing (e.g., orderBy requires index)
      console.warn("Index missing, falling back to simple query", error);
      const simpleQ = collection(db, 'invoices');
      onSnapshot(simpleQ, (snap) => {
        const data: Invoice[] = [];
        snap.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Invoice);
        });
        // Sort manually on client
        data.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setInvoices(data);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            الفواتير
          </h1>
          <p className="text-gray-500 mt-1">سجل فواتير العملاء المُدارة آلياً بواسطة الذكاء الاصطناعي.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد فواتير حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium">
                  <th className="p-4 text-right">رقم الفاتورة</th>
                  <th className="p-4 text-right">الوصف</th>
                  <th className="p-4 text-right">المبلغ</th>
                  <th className="p-4 text-right">تاريخ الإنشاء</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">#{inv.id.slice(0, 6)}</td>
                    <td className="p-4 text-sm text-gray-700">{inv.description}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">{inv.amount} ريال</td>
                    <td className="p-4 text-sm text-gray-500">
                      {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString('ar-EG') : 'غير متوفر'}
                    </td>
                    <td className="p-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          مدفوعة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                          <Clock className="w-3.5 h-3.5" />
                          غير مدفوعة
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400">
                          <Check className="w-4 h-4" />
                          تم التحصيل
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePayment(inv.id)}
                          disabled={processingId === inv.id}
                          className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {processingId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          تسديد
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
