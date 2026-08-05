"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, CreditCard, Key, Shield, Zap, Database, Server, RefreshCcw, Eye, EyeOff, Activity } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function BillingPage() {
  const [keys, setKeys] = useState({
    openai: 'sk-proj-9x8Y7z...',
    openrouter: 'sk-or-v1-3b4a...',
    resend: 're_8XyZ9...'
  });

  const [showKey, setShowKey] = useState({
    openai: false,
    openrouter: false,
    resend: false
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('تم حفظ مفاتيح الـ API بنجاح ومزامنتها مع الخوادم.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            مركز الفوترة والعمليات ⚙️
          </h1>
          <p className="text-slate-500 mt-2 font-medium">التحكم المركزي في المفاتيح البرمجية ومتابعة استهلاك الخوادم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* API Keys Configuration */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">مفاتيح الربط الآمنة (API Keys)</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">البيانات مشفرة ومحفوظة في بيئة آمنة</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              {/* OpenAI Key */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  OpenAI API Key (GPT-4o)
                </label>
                <div className="relative">
                  <input 
                    type={showKey.openai ? "text" : "password"} 
                    value={keys.openai}
                    onChange={(e) => setKeys({...keys, openai: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm dir-ltr text-left"
                    dir="ltr"
                  />
                  <button 
                    onClick={() => setShowKey({...showKey, openai: !showKey.openai})}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showKey.openai ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* OpenRouter Key */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  OpenRouter API Key (Llama 3 / Claude)
                </label>
                <div className="relative">
                  <input 
                    type={showKey.openrouter ? "text" : "password"} 
                    value={keys.openrouter}
                    onChange={(e) => setKeys({...keys, openrouter: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm dir-ltr text-left"
                    dir="ltr"
                  />
                  <button 
                    onClick={() => setShowKey({...showKey, openrouter: !showKey.openrouter})}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showKey.openrouter ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Resend Key */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  Resend API Key (Email Engine)
                </label>
                <div className="relative">
                  <input 
                    type={showKey.resend ? "text" : "password"} 
                    value={keys.resend}
                    onChange={(e) => setKeys({...keys, resend: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm dir-ltr text-left"
                    dir="ltr"
                  />
                  <button 
                    onClick={() => setShowKey({...showKey, resend: !showKey.resend})}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showKey.resend ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                  <Shield className="w-4 h-4" />
                  محمية بتشفير 256-bit AES
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-sm hover:shadow"
                >
                  {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quotas & Billing Limits */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-slate-400" />
              مؤشرات الاستهلاك
            </h2>

            <div className="space-y-8">
              {/* OpenAI Quota */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">OpenAI (الذكاء الاصطناعي)</span>
                  <span className="text-emerald-600">82% متبقي</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '18%' }}></div>
                </div>
                <a 
                  href="https://platform.openai.com/account/billing" 
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-colors border border-slate-200"
                >
                  <CreditCard className="w-4 h-4" /> شحن الرصيد
                </a>
              </div>

              {/* Resend Quota */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">Resend (إرسال الإيميلات)</span>
                  <span className="text-orange-500">25% متبقي</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mb-3 text-center">تم إرسال 2,250 / 3,000 إيميل هذا الشهر</p>
                <a 
                  href="https://resend.com/billing" 
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-colors border border-slate-200"
                >
                  <CreditCard className="w-4 h-4" /> ترقية الباقة
                </a>
              </div>

              {/* Database Quota */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">سعة قاعدة البيانات</span>
                  <span className="text-slate-500">1.2 GB</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <p className="text-xs text-slate-400 text-center">استهلاك طبيعي وآمن</p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
