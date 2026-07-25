"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Calendar as CalendarIcon, Clock, User, Mail, MessageSquare, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { markSmartStop } from '@/app/actions/campaigns';

export default function BookingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: DateTime, 2: Details, 3: Success
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: ''
  });

  // Generate next 5 business days
  const availableDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  }).filter(d => d.getDay() !== 5 && d.getDay() !== 6).slice(0, 5); // Exclude Fri/Sat typically in Middle East

  const availableTimes = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

  const handleNext = () => {
    if (step === 1) {
      if (!selectedDate || !selectedTime) {
        toast.error('الرجاء اختيار اليوم والوقت المناسبين أولاً.');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      // Create meeting date combining selectedDate and selectedTime
      const meetingDateTime = new Date(selectedDate!);
      const [time, period] = selectedTime!.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      meetingDateTime.setHours(hours, minutes, 0, 0);

      await addDoc(collection(db, 'meetings'), {
        clientName: formData.name,
        clientEmail: formData.email,
        notes: formData.notes,
        meetingDate: meetingDateTime.toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });

      // Smart Stop
      await markSmartStop(formData.email, 'booking');

      setStep(3);
    } catch (error) {
      console.error("Booking error:", error);
      toast.error('حدث خطأ أثناء تثبيت الموعد. الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col" dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
            M
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Mango AI</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Info) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full">
          <h2 className="text-xl font-bold text-slate-800 mb-6">استكشاف حلول Mango AI</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-slate-800">مدة الاجتماع</h4>
                <p className="text-slate-500 text-sm mt-1">30 دقيقة</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CalendarIcon className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-slate-800">الهدف من الاجتماع</h4>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  مناقشة التحديات الرقمية الخاصة بمنشأتك، واستعراض كيف يمكن لتقنياتنا أن تضاعف كفاءة أعمالك.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Interactive Form) */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-8">اختر اليوم والوقت المناسب لك</h2>
                
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">الأيام المتاحة</h3>
                  <div className="flex flex-wrap gap-3">
                    {availableDates.map((date, i) => {
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(date)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all min-w-[100px] ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' 
                              : 'border-slate-100 hover:border-orange-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span className="text-sm mb-1">{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</span>
                          <span className="text-xl font-bold">{date.getDate()}</span>
                          <span className="text-xs">{date.toLocaleDateString('ar-EG', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">الأوقات المتاحة</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableTimes.map((time, i) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 rounded-xl border-2 font-medium transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                              : 'border-slate-100 hover:border-orange-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleNext}
                    disabled={!selectedDate || !selectedTime}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="flex items-center gap-4 mb-8">
                  <button 
                    onClick={() => setStep(1)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-900">تفاصيل التواصل</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <User className="w-4 h-4 text-orange-500" />
                      الاسم الكامل *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-3 outline-none transition-all text-slate-800"
                      placeholder="محمد عبدالله..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <Mail className="w-4 h-4 text-orange-500" />
                      البريد الإلكتروني *
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-3 outline-none transition-all text-slate-800 text-left"
                      placeholder="name@company.com"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      ملاحظات أو نبذة عن نشاطكم (اختياري)
                    </label>
                    <textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-4 py-3 outline-none transition-all text-slate-800 resize-none"
                      placeholder="نرغب في مناقشة..."
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري التأكيد...
                        </>
                      ) : (
                        <>تأكيد الحجز</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 flex flex-col items-center justify-center text-center h-full min-h-[500px]"
              >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">تم تأكيد موعدك بنجاح!</h2>
                <p className="text-slate-600 text-lg max-w-md mx-auto leading-relaxed mb-8">
                  شكراً لك يا {formData.name.split(' ')[0]}، تم حجز الاجتماع يوم {selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} الساعة {selectedTime}.
                </p>
                
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 inline-block text-right w-full max-w-sm">
                  <h4 className="font-semibold text-slate-800 mb-2">الخطوة القادمة:</h4>
                  <p className="text-slate-500 text-sm">سيتم إرسال رابط الاجتماع الافتراضي إلى بريدك الإلكتروني قريباً. نتطلع للقائك!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
