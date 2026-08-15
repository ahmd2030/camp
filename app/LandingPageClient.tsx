"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Network, Zap, Shield, Search, ArrowLeft, BrainCircuit, Globe, BarChart3, User } from 'lucide-react';

export default function LandingPageClient() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-orange-200" dir="rtl">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Network className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Mango AI
            </span>
          </div>
          <div className="hidden md:flex gap-8 font-semibold text-slate-600">
            <a href="#vision" className="hover:text-orange-500 transition-colors">رؤيتنا</a>
            <a href="#solutions" className="hover:text-orange-500 transition-colors">الحلول التقنية</a>
            <a href="#impact" className="hover:text-orange-500 transition-colors">الأثر</a>
          </div>
          <div>
            <Link href="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
              بوابة النظام
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-600">الجيل القادم من خوارزميات الربط الذكي</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              التكنولوجيا المعقدة لصناعة
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 block mt-2">
                الصلات البسيطة.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl text-slate-600 mb-12 leading-relaxed">
              في عالم مليء بالمنتجات والاحتياجات المشتتة، نقوم ببناء جسور رقمية فائقة الذكاء. خوارزمياتنا تحلل السوق، ترصد الفجوات، وتجمع الأطراف المحتاجة لبعضها في اللحظة المناسبة، لنجعل المستحيل ممكناً.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2">
                دخول النظام المركزي
              </Link>
              <a href="#vision" className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-2">
                اكتشف خوارزمياتنا
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">رؤيتنا: هندسة اللقاء المثالي</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                لا نؤمن بالصدف في عالم الأعمال. رؤية <span className="font-bold text-slate-800">Mango AI</span> تتمركز حول حقيقة واحدة: لكل عميل يبحث عن حل، هناك منتج مثالي ينتظره، والعكس صحيح.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                نحن لا نقوم بالتسويق التقليدي، بل نبني أنظمة تكنولوجية شديدة التعقيد تعمل كـ "عقل مدبر" يمسح البيانات الضخمة، يحلل سلوكيات السوق، ويجمع الطرفين بدقة جراحية وبشكل آلي بالكامل.
              </p>
              
              <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">الذكاء الاصطناعي التنبؤي</h4>
                  <p className="text-slate-600 text-sm">محركاتنا تتنبأ باحتياج العميل قبل أن يبدأ رحلة البحث عن الحل.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-tr from-orange-100 to-indigo-50 rounded-[3rem] p-8 relative overflow-hidden border border-white/50 shadow-2xl">
                {/* Abstract Tech Representation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border border-orange-200 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="w-48 h-48 border border-indigo-200 rounded-full absolute animate-[spin_15s_linear_infinite_reverse]" />
                  
                  {/* Center Node */}
                  <div className="absolute z-20 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center rotate-12">
                    <Network className="w-10 h-10 text-slate-800" />
                  </div>
                  
                  {/* Orbiting Nodes */}
                  <div className="absolute top-1/4 left-1/4 w-12 h-12 bg-orange-500 rounded-full shadow-lg flex items-center justify-center animate-bounce delay-75">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center animate-bounce delay-300">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section id="solutions" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6">آلية العمل: تبسيط المعقد</h2>
            <p className="text-slate-400 text-lg">
              خلف الكواليس، تدير خوارزمياتنا ملايين العمليات في الثانية الواحدة لضمان توصيل العميل المناسب بالمنتج المناسب.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm"
            >
              <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">الاستكشاف العميق</h3>
              <p className="text-slate-400 leading-relaxed">
                تقوم العناكب الرقمية بمسح الأسواق وتحليل تقييمات الشركات، استخراج نقاط الضعف، وتحديد الجهات التي تعاني من مشاكل محددة بدقة.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm"
            >
              <div className="w-14 h-14 bg-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center mb-6">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">المطابقة الذكية</h3>
              <p className="text-slate-400 leading-relaxed">
                يتدخل المحلل الذكي لفهم "نقطة الألم" ومطابقتها فورياً مع المنتج أو الخدمة القادرة على حل المشكلة جذرياً.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm"
            >
              <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">التواصل الآلي</h3>
              <p className="text-slate-400 leading-relaxed">
                بناء قنوات تواصل مخصصة تعتمد على علم النفس البيعي للتواصل مع الطرف المستهدف، وعقد الشراكات والصفقات بالنيابة عنك.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-slate-50 pt-24 pb-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-[3rem] p-12 text-center text-white mb-20 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6">هل أنت مستعد لقيادة المستقبل؟</h2>
              <p className="text-xl text-orange-50 mb-10 max-w-2xl mx-auto">
                نحن لا نبيع برمجيات، نحن نوفر بنية تحتية للتجارة الذكية والروابط العميقة.
              </p>
              <Link href="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all inline-flex items-center gap-2">
                دخول النظام الإداري
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xl">
              <Network className="w-6 h-6 text-orange-500" />
              Mango AI
            </div>
            <p>© 2026 Mango AI. جميع الحقوق محفوظة للأنظمة التكنولوجية المعقدة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
