"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Send, Loader2, CheckCircle2, User, Bot, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

interface PlanData {
  niche: string;
  platform: string;
  signupLink: string;
}

export default function BoardroomPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  
  const [affiliateLink, setAffiliateLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [campaignSaved, setCampaignSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Start initial meeting
    startMeeting();
  }, []);

  const startMeeting = async () => {
    setIsTyping(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages([{ role: 'assistant', content: data.message }]);
        if (data.planData) setPlanData(data.planData);
      } else {
        toast.error('حدث خطأ في قاعة الاجتماعات.');
      }
    } catch (error) {
      toast.error('فشل الاتصال بالوكلاء.');
    }
    setIsTyping(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.message }]);
        if (data.planData) setPlanData(data.planData);
      } else {
        toast.error('لم يتمكن المدير العام من الرد.');
      }
    } catch (error) {
      toast.error('فشل الاتصال بالمدير العام.');
    }
    setIsTyping(false);
  };

  const handleApprovePlan = async () => {
    if (!affiliateLink.trim()) {
      toast.error('الرجاء إدخال رابط الإحالة الخاص بك.');
      return;
    }
    if (!planData) {
      toast.error('الخطة غير مكتملة بعد.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: planData.niche,
          platform: planData.platform,
          signupLink: planData.signupLink,
          affiliateLink: affiliateLink
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('تم اعتماد الخطة وحفظها في العمليات بنجاح!');
        setCampaignSaved(true);
      } else {
        toast.error('حدث خطأ أثناء حفظ الخطة.');
      }
    } catch (error) {
      toast.error('فشل الاتصال بخادم العمليات.');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 fixed top-0 w-full z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">غرفة الاجتماعات (The Boardroom)</h1>
              <p className="text-sm text-gray-500">نظام الوكلاء المتعددين للشركة</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Chat Section */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && !isTyping && (
              <div className="flex items-center justify-center h-full text-gray-400">
                جاري دعوة المدراء للاجتماع...
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  <p className="text-sm font-semibold mb-1 opacity-80">
                    {msg.role === 'user' ? 'الـ CEO (أنت)' : 'المدير العام (GM)'}
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 max-w-[85%] ml-auto">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="p-4 rounded-2xl bg-gray-100 rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                  <span className="text-sm text-gray-500">المدراء يتشاورون...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="توجيهاتك للمدير العام..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pr-6 pl-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={isTyping}
              />
              <button 
                type="submit"
                disabled={isTyping || !input.trim()}
                className="absolute left-2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5 -ml-1" />
              </button>
            </div>
          </form>
        </div>

        {/* Executive Plan Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              الخطة التنفيذية
            </h2>
            
            {!planData ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
                <p className="text-sm">جاري صياغة الخطة...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">المجال المستهدف (Niche)</label>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm font-medium text-gray-800 border border-gray-100">
                    {planData.niche}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">منصة الشراكة</label>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm font-medium text-gray-800 border border-gray-100">
                    {planData.platform}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">رابط التسجيل للمسوقين</label>
                  <a href={planData.signupLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    {planData.signupLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg border border-gray-700 p-5 text-white">
            <h3 className="text-lg font-bold mb-4">الاعتماد النهائي</h3>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              قم بالتسجيل في المنصة المقترحة، ثم انسخ رابط الإحالة الخاص بك (Affiliate Link) وضعه هنا لاعتماد الخطة للعمليات.
            </p>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="رابط الإحالة (Affiliate Link)"
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-left"
                dir="ltr"
                disabled={isSaving || campaignSaved}
              />
              <button
                onClick={handleApprovePlan}
                disabled={!planData || isSaving || campaignSaved}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  campaignSaved 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50'
                }`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 campaignSaved ? <CheckCircle2 className="w-5 h-5" /> : null}
                {campaignSaved ? 'تم اعتماد الخطة!' : 'اعتماد وإرسال للعمليات'}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
