"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FileText, Loader2, CheckCircle, Clock, Check, Link2, Copy, AlertCircle, Globe, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { generatePaymentLinks } from '@/services/payments/paymentRouter';

interface Invoice {
  id: string;
  clientId?: string;
  clientName?: string;
  description: string;
  amount: number;
  status: string;
  paymentLink?: string;
  stripePaymentLink?: string;
  paytabsPaymentLink?: string;
  createdAt: any;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleGenerateLinks = async (id: string, amount: number) => {
    if (!id) return;
    setProcessingId(id);
    try {
      const result = await generatePaymentLinks(id, amount);
      if (result.success) {
        toast.success('تم إنشاء روابط الدفع بنجاح!');
      } else {
        toast.error('حدث خطأ أثناء توليد الروابط');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyLink = (link?: string, gatewayName?: string) => {
    if (!link) {
      toast.info('رابط الدفع غير متوفر بعد');
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success(`تم نسخ رابط ${gatewayName || 'الدفع'}`);
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
          <p className="text-gray-500 mt-1">الموزع المالي الهجين: إدارة وتوجيه المدفوعات محلياً وعالمياً.</p>
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
                  <th className="p-4 text-right w-64">الإجراءات والروابط</th>
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
                    <td className="p-4">
                      {/* إذا لم تكن هناك روابط بعد، نظهر أزرار التوليد المزدوجة */}
                      {!inv.stripePaymentLink && !inv.paytabsPaymentLink && inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleGenerateLinks(inv.id, inv.amount)}
                            disabled={processingId === inv.id}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {processingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                            توليد رابط عالمي (Stripe)
                          </button>
                          <button
                            onClick={() => handleGenerateLinks(inv.id, inv.amount)}
                            disabled={processingId === inv.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {processingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            توليد رابط محلي (PayTabs/مدى)
                          </button>
                        </div>
                      ) : (
                        /* عرض الروابط بعد توليدها */
                        <div className="flex flex-col gap-2">
                          {inv.stripePaymentLink && (
                            <div className="flex items-center justify-between bg-green-50 text-green-800 border border-green-200 rounded-md px-2 py-1.5 text-xs">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Globe className="w-3.5 h-3.5 text-green-600" /> Stripe
                              </div>
                              <button onClick={() => handleCopyLink(inv.stripePaymentLink, 'Stripe')} className="p-1 hover:bg-green-200 rounded transition-colors text-green-700" title="نسخ رابط Stripe">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {inv.paytabsPaymentLink && (
                            <div className="flex items-center justify-between bg-blue-50 text-blue-800 border border-blue-200 rounded-md px-2 py-1.5 text-xs">
                              <div className="flex items-center gap-1.5 font-medium">
                                <CreditCard className="w-3.5 h-3.5 text-blue-600" /> PayTabs
                              </div>
                              <button onClick={() => handleCopyLink(inv.paytabsPaymentLink, 'PayTabs')} className="p-1 hover:bg-blue-200 rounded transition-colors text-blue-700" title="نسخ رابط PayTabs">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {inv.paymentLink && !inv.stripePaymentLink && !inv.paytabsPaymentLink && (
                            <div className="flex items-center justify-between bg-gray-100 text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 text-xs">
                              <span className="font-medium">الرابط القديم</span>
                              <button onClick={() => handleCopyLink(inv.paymentLink, 'الرابط القديم')} className="p-1 hover:bg-gray-200 rounded transition-colors" title="نسخ الرابط">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
