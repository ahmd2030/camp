"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface Client {
  id: string;
  name: string;
}

export default function AiCommandInterface() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const data: Client[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, name: doc.data().name });
      });
      setClients(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);

    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      
      const response = await fetch('/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          clientId: selectedClientId || undefined,
          clientName: selectedClient?.name || undefined
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'حدث خطأ غير متوقع أثناء معالجة الأمر.');
      }

      setPrompt("");
      setSelectedClientId("");
      toast.success('تم استلام وتحليل الأمر بنجاح!');
      
    } catch (error: any) {
      toast.error(error.message || 'فشل الاتصال بالخادم.');
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
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={isSubmitting}
            className="sm:w-1/4 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-4 transition-all outline-none"
          >
            <option value="">-- العميل (اختياري) --</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          <div className="relative flex items-center flex-1">
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
          </div>
        </form>
      </div>
    </div>
  );
}
