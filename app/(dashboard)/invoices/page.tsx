"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FileText, Loader2, CheckCircle, Clock, Check, Link2, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  clientId?: string;
  clientName?: string;
  description: string;
  amount: number;
  status: string;
  paymentLink?: string;
  createdAt: any;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCreatePaymentLink = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    try {
      // محاكاة إنشاء رابط دفع، سيتم استبدالها بربط حقيقي في المرحلة القادمة
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم إنشاء رابط الدفع بنجاح (محاكاة)!');
    } catch (error) {
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyLink = (link?: string) => {
    if (!link) {
      toast.info('رابط الدفع غير متوفر بعد');
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط الدفع');
  };

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Invoice[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      console.warn("Index missing, falling back to simple query", error);
      const simpleQ = collection(db, 'invoices');
      onSnapshot(simpleQ, (snap) => {
        const data: Invoice[] = [];
        snap.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Invoice);
        });
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            الفواتير
          </h1>
          <p className="text-gray-500 mt-1">سجل فواتير العملاء وروابط الدفع.</p>
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
                  <th className="p-4 text-right">العميل</th>
                  <th className="p-4 text-right">الخدمة/الوصف</th>
                  <th className="p-4 text-right">المبلغ</th>
                  <th className="p-4 text-right">التاريخ</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">#{inv.id.slice(0, 6)}</td>
                    <td className="p-4 text-sm text-gray-700">{inv.clientName || inv.clientId || 'غير محدد'}</td>
                    <td className="p-4 text-sm text-gray-700">{inv.description}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">{inv.amount} ريال</td>
                    <td className="p-4 text-sm text-gray-500">
                      {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString('ar-EG') : 'غير متوفر'}
                    </td>
                    <td className="p-4">
                      {inv.status === 'PAID' || inv.status === 'paid' || inv.status === 'مدفوعة' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          مدفوعة
                        </span>
                      ) : inv.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          ملغية
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                          <Clock className="w-3.5 h-3.5" />
                          {inv.status === 'PENDING' ? 'قيد الانتظار' : 'غير مدفوعة'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      <button
                        onClick={() => handleCreatePaymentLink(inv.id)}
                        disabled={processingId === inv.id || inv.status === 'PAID' || inv.status === 'paid' || inv.status === 'مدفوعة'}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="إنشاء رابط دفع"
                      >
                        {processingId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        إنشاء الرابط
                      </button>
                      <button
                        onClick={() => handleCopyLink(inv.paymentLink || 'https://dummy-payment-link.com/pay/' + inv.id)}
                        className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="نسخ الرابط"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
