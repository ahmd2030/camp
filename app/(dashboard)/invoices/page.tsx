"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2,
  Receipt,
  FileText,
  DollarSign,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { getInvoices, addInvoice, deleteInvoice, updateInvoiceStatus, InvoiceData } from '@/services/invoices';
import { getClients, ClientData } from '@/services/clients';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'مدفوعة' | 'غير مدفوعة' | 'متأخرة'>('غير مدفوعة');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedInvoices, fetchedClients] = await Promise.all([getInvoices(), getClients()]);
    setInvoices(fetchedInvoices);
    setClients(fetchedClients);
    if (fetchedClients.length > 0) setClientName(fetchedClients[0].name);
    setLoading(false);
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const newInvoice: InvoiceData = { 
      clientName, 
      amount: parseFloat(amount), 
      description, 
      issueDate, 
      dueDate, 
      status 
    };

    const result = await addInvoice(newInvoice);
    if (result.success) {
      setIsModalOpen(false);
      setAmount(''); setDescription(''); setIssueDate(''); setDueDate(''); setStatus('غير مدفوعة');
      fetchData();
    } else {
      alert('حدث خطأ أثناء الإضافة.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      await deleteInvoice(id);
      fetchData();
    }
  };

  const toggleStatus = async (invoice: InvoiceData) => {
    // Cycle status: غير مدفوعة -> مدفوعة -> متأخرة -> غير مدفوعة
    let newStatus: 'مدفوعة' | 'غير مدفوعة' | 'متأخرة' = 'مدفوعة';
    if (invoice.status === 'مدفوعة') newStatus = 'متأخرة';
    if (invoice.status === 'متأخرة') newStatus = 'غير مدفوعة';
    
    await updateInvoiceStatus(invoice.id!, newStatus);
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(value);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">نظام الفواتير والمبيعات</h1>
          <p className="text-gray-500 mt-1 text-sm">إدارة الفواتير، متابعة المدفوعات، وإصدار المطالبات المالية.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-sm text-sm">
          <Plus className="w-4 h-4" />
          <span>إنشاء فاتورة</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">لا توجد فواتير حالياً</h3>
          <p className="text-gray-500 mt-1">ابدأ بإنشاء أول فاتورة مبيعات لعملائك.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                  <th className="py-4 px-6 font-medium whitespace-nowrap">العميل / الوصف</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">المبلغ</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">تاريخ الإصدار</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">تاريخ الاستحقاق</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">الحالة</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">{invoice.clientName}</span>
                          <span className="text-xs text-gray-500">{invoice.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900" dir="ltr">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span dir="ltr">{invoice.issueDate}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      <span dir="ltr">{invoice.dueDate}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => toggleStatus(invoice)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        invoice.status === 'مدفوعة' 
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                          : invoice.status === 'متأخرة'
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                      }`}>
                        {invoice.status === 'مدفوعة' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {invoice.status === 'متأخرة' && <AlertCircle className="w-3.5 h-3.5" />}
                        {invoice.status === 'غير مدفوعة' && <Clock className="w-3.5 h-3.5" />}
                        {invoice.status}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <button onClick={() => handleDelete(invoice.id!)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in-95">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-primary" /> إنشاء فاتورة مالية
              </h2>
              <form onSubmit={handleAddInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                  <select required value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary">
                    {clients.map(client => (
                      <option key={client.id} value={client.name}>{client.name} - {client.company}</option>
                    ))}
                    {clients.length === 0 && <option value="عميل عام">عميل عام (لا يوجد عملاء مضافين)</option>}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ الإجمالي (رس)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input required value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-primary text-left" dir="ltr" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإصدار</label>
                    <input required value={issueDate} onChange={e => setIssueDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
                    <input required value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وصف الفاتورة (الخدمات المقدمة)</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary resize-none" placeholder="مثال: تصميم موقع إلكتروني، استضافة سنوية..." />
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">إصدار الفاتورة</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
