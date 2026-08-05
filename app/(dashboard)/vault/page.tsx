"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Link as LinkIcon, ExternalLink, Search, Copy, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

interface VaultItem {
  id: string;
  productName: string;
  platformName: string;
  affiliateLink: string;
  addedAt: any;
}

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    try {
      const q = query(collection(db, 'vault'), orderBy('addedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      // We will de-duplicate locally based on affiliateLink so the vault doesn't show the exact same link twice
      const uniqueLinks = new Set();
      const fetched: VaultItem[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as VaultItem;
        if (!uniqueLinks.has(data.affiliateLink)) {
          uniqueLinks.add(data.affiliateLink);
          fetched.push({ id: doc.id, ...data });
        }
      });
      
      setItems(fetched);
    } catch (error) {
      console.error('Error fetching vault:', error);
      toast.error('فشل جلب الشراكات من الخزنة');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('تم نسخ الرابط');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter(item => 
    item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.platformName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-600" />
            خزنة الشراكات 💼
          </h1>
          <p className="text-slate-500 mt-2 font-medium">أصول الروابط، المنتجات، والمحافظ الخاصة بك محفوظة هنا تلقائياً</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ابحث عن منتج أو منصة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">الخزنة فارغة</h3>
          <p className="text-slate-500 max-w-md mx-auto">سيتم حفظ روابط الإحالة الخاصة بك هنا تلقائياً بمجرد إرسالك لأي فرصة من الطيار الآلي.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => {
            // Attempt to get the root domain of the affiliate link to serve as the "Go to Platform" URL
            let platformRootUrl = item.affiliateLink;
            try {
              const urlObj = new URL(item.affiliateLink);
              platformRootUrl = urlObj.origin;
            } catch(e) {}

            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:bg-indigo-100 transition-colors"></div>
                
                <div className="relative z-10 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                      <LinkIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      {item.platformName}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-1">{item.productName}</h3>
                  <p className="text-sm text-slate-500 mb-6 font-medium">تم الحفظ تلقائياً</p>
                  
                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100 group-hover:border-indigo-100 transition-colors">
                    <span className="text-xs font-mono text-slate-500 truncate ml-4 w-48" dir="ltr">
                      {item.affiliateLink}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(item.id, item.affiliateLink)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      title="نسخ الرابط"
                    >
                      {copiedId === item.id ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 relative z-10">
                  <a 
                    href={platformRootUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow"
                  >
                    الذهاب للمحفظة / سحب الأرباح
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
