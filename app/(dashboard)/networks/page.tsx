"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, ExternalLink, ShieldCheck, ShoppingCart, Activity, Tag, Network, Plus, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';

const DEFAULT_NETWORKS = [
  {
    id: 'amazon',
    name: 'Amazon Associates',
    description: 'أكبر برنامج تسويق بالعمولة في العالم، مناسب للمنتجات المادية بجميع أنواعها.',
    url: 'https://affiliate-program.amazon.com',
    icon: <ShoppingCart className="w-8 h-8 text-orange-500" />,
    color: 'bg-orange-50',
    borderColor: 'border-orange-100',
    hoverColor: 'hover:border-orange-300'
  },
  {
    id: 'shareasale',
    name: 'ShareASale',
    description: 'شبكة ضخمة تضم آلاف الشركات في مجالات التكنولوجيا، الأزياء، والبرمجيات.',
    url: 'https://www.shareasale.com',
    icon: <Activity className="w-8 h-8 text-blue-500" />,
    color: 'bg-blue-50',
    borderColor: 'border-blue-100',
    hoverColor: 'hover:border-blue-300'
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    description: 'المنصة الأولى عالمياً للمنتجات الرقمية والكورسات مع عمولات تصل إلى 75%.',
    url: 'https://www.clickbank.com',
    icon: <Tag className="w-8 h-8 text-red-500" />,
    color: 'bg-red-50',
    borderColor: 'border-red-100',
    hoverColor: 'hover:border-red-300'
  },
  {
    id: 'cj',
    name: 'CJ Affiliate',
    description: 'شبكة راقية جداً تضم علامات تجارية عالمية كبرى وبرامج ذات عوائد مجزية.',
    url: 'https://www.cj.com',
    icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    hoverColor: 'hover:border-emerald-300'
  },
  {
    id: 'impact',
    name: 'Impact',
    description: 'منصة حديثة وسريعة النمو للتسويق بالشراكة مع علامات تقنية وخدمات سحابية.',
    url: 'https://impact.com',
    icon: <Network className="w-8 h-8 text-purple-500" />,
    color: 'bg-purple-50',
    borderColor: 'border-purple-100',
    hoverColor: 'hover:border-purple-300'
  }
];

export default function NetworksPage() {
  const [dbNetworks, setDbNetworks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No orderBy to avoid missing index issues easily
    const q = query(collection(db, 'affiliate_networks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      // Sort locally by timestamp
      fetched.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tA - tB;
      });
      setDbNetworks(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching networks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) {
      toast.error('يرجى إدخال اسم المنصة والرابط');
      return;
    }
    
    // Auto-fix URL if it doesn't start with http
    let finalUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsAdding(true);
    try {
      await addDoc(collection(db, 'affiliate_networks'), {
        name: newName.trim(),
        url: finalUrl,
        description: 'منصة تسويق بالعمولة مضافة يدوياً.',
        createdAt: serverTimestamp()
      });
      toast.success('تم إضافة المنصة بنجاح');
      setNewName('');
      setNewUrl('');
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding network:', error);
      toast.error('فشل إضافة المنصة: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const dynamicNetworks = dbNetworks.map(n => ({
    id: n.id,
    name: n.name,
    description: n.description || 'منصة مضافة',
    url: n.url,
    icon: <Link2 className="w-8 h-8 text-indigo-500" />,
    color: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
    hoverColor: 'hover:border-indigo-300'
  }));

  const allNetworks = [...DEFAULT_NETWORKS, ...dynamicNetworks];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Link2 className="w-8 h-8 text-indigo-600" />
            بوابة الشبكات (بنك الروابط)
          </h1>
          <p className="text-slate-500 text-lg">
            وصول سريع ومباشر لأشهر منصات التسويق بالعمولة لإنشاء روابطك وإضافتها للنظام.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة منصة جديدة
        </button>
      </div>

      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 overflow-hidden"
        >
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">إضافة منصة إحالة جديدة</h2>
            <form onSubmit={handleAddNetwork} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">اسم المنصة</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="مثال: ClickFunnels"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الرابط (URL)</label>
                <input 
                  type="text" 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="مثال: https://affiliates.clickfunnels.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-left font-mono"
                  dir="ltr"
                  required
                />
              </div>
              <div className="flex justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl ml-3 font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={isAdding}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  حفظ المنصة
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allNetworks.map((network, index) => (
            <motion.div
              key={network.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <a 
                href={network.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`block bg-white p-6 rounded-3xl border-2 ${network.borderColor} ${network.hoverColor} transition-all shadow-sm hover:shadow-md h-full group`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${network.color}`}>
                    {network.icon}
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 mb-3">{network.name}</h2>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {network.description}
                </p>
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

