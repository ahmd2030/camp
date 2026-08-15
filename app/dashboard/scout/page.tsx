"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Download, Building2, Phone, Globe, Star, Activity } from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface Lead {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string;
  website: string;
  rating: number;
  reviews: number;
}

export default function ScoutPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location) {
      toast.error('يرجى إدخال المجال والمدينة');
      return;
    }

    setLoading(true);
    setLeads([]);

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, limit })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل البحث');
      }

      setLeads(data.leads || []);
      
      if (data.leads?.length === 0) {
        toast.info('لم يتم العثور على نتائج مطابقة.');
      } else {
        toast.success(`تم استخراج ${data.leads.length} شركة بنجاح!`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (leads.length === 0) return;

    // Create CSV header
    const headers = ['اسم الشركة', 'المجال', 'رقم الهاتف', 'العنوان', 'الموقع الإلكتروني', 'التقييم', 'عدد التقييمات'];
    
    // Map data to rows
    const rows = leads.map(lead => [
      `"${lead.name.replace(/"/g, '""')}"`,
      `"${lead.type.replace(/"/g, '""')}"`,
      `"${lead.phone.replace(/"/g, '""')}"`,
      `"${lead.address.replace(/"/g, '""')}"`,
      `"${lead.website.replace(/"/g, '""')}"`,
      lead.rating,
      lead.reviews
    ]);

    // Combine headers and rows with semicolon delimiter for Arabic Excel
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشاف-العملاء-${query}-${location}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تحميل ملف الإكسيل بنجاح!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            كشّاف العملاء 🔍
          </h1>
          <p className="text-slate-500 mt-2 font-medium">استخراج فوري للشركات، المتاجر، والهواتف وتصديرها لـ Excel</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
        <form onSubmit={handleSearch} className="relative z-10 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="مثال: شركات تسويق عقاري، عيادات أسنان..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              required
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="مثال: دبي، الرياض، مصر..." 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              required
            />
          </div>
          <div className="w-full md:w-32">
            <select 
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            >
              <option value={10}>10 نتائج</option>
              <option value={20}>20 نتيجة</option>
              <option value={50}>50 نتيجة</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 md:w-auto w-full disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Activity className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            ابحث الآن
          </button>
        </form>
      </div>

      {/* Results Area */}
      {leads.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              النتائج ({leads.length})
            </h2>
            <button 
              onClick={downloadExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              تحميل Excel (CSV)
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="py-4 px-6 font-bold whitespace-nowrap">اسم الشركة</th>
                  <th className="py-4 px-6 font-bold whitespace-nowrap">النشاط / المجال</th>
                  <th className="py-4 px-6 font-bold whitespace-nowrap">رقم الهاتف</th>
                  <th className="py-4 px-6 font-bold whitespace-nowrap">العنوان</th>
                  <th className="py-4 px-6 font-bold whitespace-nowrap">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div className="flex flex-col gap-1">
                        {lead.name}
                        {lead.website !== 'غير متوفر' && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-500 flex items-center gap-1 hover:underline w-fit" dir="ltr">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        {lead.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1" dir="ltr">
                        {lead.phone !== 'غير متوفر' && <Phone className="w-3 h-3 text-slate-400" />}
                        {lead.phone}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium min-w-[200px]">
                      {lead.address}
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {lead.rating > 0 ? (
                        <div className="flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-4 h-4 fill-amber-500" />
                          {lead.rating} <span className="text-slate-400 font-medium text-xs">({lead.reviews})</span>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!loading && leads.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 opacity-50">
          <Search className="w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold">ابحث لاستخراج بيانات الشركات</h3>
        </div>
      )}
    </div>
  );
}
