"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Link2, ExternalLink, ShieldCheck, ShoppingCart, Activity, Tag, Network } from 'lucide-react';

export default function NetworksPage() {
  const networks = [
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
          <Link2 className="w-8 h-8 text-indigo-600" />
          بوابة الشبكات (بنك الروابط)
        </h1>
        <p className="text-slate-500 text-lg">
          وصول سريع ومباشر لأشهر منصات التسويق بالعمولة لإنشاء روابطك وإضافتها للنظام.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {networks.map((network, index) => (
          <motion.div
            key={network.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
    </div>
  );
}
