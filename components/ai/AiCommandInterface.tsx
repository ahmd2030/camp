"use client";

import React, { useState } from 'react';
import { Sparkles, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AiCommandInterface() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'حدث خطأ غير متوقع أثناء معالجة الأمر.');
      }

      setPrompt("");
      setMessage({ type: 'success', text: 'تم استلام وتحليل الأمر بنجاح!' });
      
      // إخفاء رسالة النجاح بعد 4 ثوانٍ
      setTimeout(() => setMessage(null), 4000);
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'فشل الاتصال بالخادم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-l from-indigo-500 to-purple-600 rounded-2xl shadow-md p-[2px] mt-6">
      <div className="bg-white rounded-[14px] p-6 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">الأوامر المباشرة للمساعد الذكي</h2>
            <p className="text-sm text-gray-500">اطلب أي مهمة وسيقوم الذكاء الاصطناعي بتنفيذها أو تحويلها للموافقة.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isSubmitting}
            placeholder="مثال: قم بصياغة فاتورة جديدة لعميل التصميم بمبلغ 2500 ريال..." 
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-4 pr-4 pl-14 transition-all disabled:opacity-50 outline-none placeholder:text-gray-400"
          />
          <button 
            type="submit" 
            disabled={isSubmitting || !prompt.trim()}
            className="absolute left-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2.5 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1 rtl:rotate-180" />}
          </button>
        </form>

        {message && (
          <div className={`mt-4 flex items-center gap-2 text-sm font-medium p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
