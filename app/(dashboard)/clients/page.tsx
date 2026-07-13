"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2,
  Building2,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { getClients, addClient, deleteClient, ClientData } from '@/services/clients';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('محتمل');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: ClientData = { name, phone, email, company, status };

    const result = await addClient(newClient);
    if (result.success) {
      setIsModalOpen(false);
      setName(''); setPhone(''); setEmail(''); setCompany('');
      fetchClients();
    } else {
      alert('حدث خطأ أثناء الإضافة.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      const result = await deleteClient(id);
      if (result.success) fetchClients();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة العملاء</h1>
          <p className="text-gray-500 mt-1 text-sm">قاعدة بيانات عملائك والشركات المرتبطة بهم.</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="ابحث بالاسم أو الشركة..."
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-sm text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">لا يوجد عملاء بعد</h3>
          <p className="text-gray-500 mt-1">ابدأ بإضافة أول عميل لك في النظام.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative group">
              <button 
                onClick={() => handleDelete(client.id!)}
                className="absolute top-4 left-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-lg">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{client.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{client.company || 'لا توجد شركة'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span dir="ltr">{client.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{client.email || '-'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  client.status === 'حالي' ? 'bg-green-50 text-green-700' :
                  client.status === 'محتمل' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-gray-50 text-gray-700'
                }`}>
                  {client.status}
                </span>
                <button className="text-sm font-medium text-primary hover:underline">
                  عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">إضافة عميل جديد</h2>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
                  <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" dir="ltr" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary">
                      <option>محتمل</option>
                      <option>حالي</option>
                      <option>سابق</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" dir="ltr" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">إضافة العميل</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
