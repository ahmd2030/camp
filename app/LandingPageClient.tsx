"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Zap, Shield, Search, BrainCircuit, Globe, BarChart3, User, ChevronDown } from 'lucide-react';

export default function LandingPageClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-orange-200" dir="rtl">
      
      {/* Navbar - Clean and Professional */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Network className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Mango AI
            </span>
          </div>
          <div className="hidden md:flex gap-10 font-semibold text-slate-600">
            <a href="#vision" className="hover:text-orange-500 transition-colors">الرؤية</a>
            <a href="#solutions" className="hover:text-orange-500 transition-colors">الحلول التقنية</a>
            <a href="#impact" className="hover:text-orange-500 transition-colors">الأثر</a>
          </div>
          <div className="w-10 h-10">
            {/* Empty space to balance the navbar, no admin links */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden flex flex-col justify-center min-h-[90vh]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-200 rounded-full blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[120px] opacity-30 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-slate-200/60 px-5 py-2.5 rounded-full mb-8 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-700 tracking-wide">الجيل القادم من خوارزميات الربط الذكي</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              التكنولوجيا المعقدة لصناعة
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 block mt-3 pb-2">
                الصلات البسيطة.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              في عالم مليء بالمنتجات والاحتياجات المشتتة، نقوم ببناء جسور رقمية فائقة الذكاء. خوارزمياتنا تحلل السوق وتجمع الأطراف المحتاجة لبعضها في اللحظة المناسبة.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex justify-center">
              <a href="#vision" className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200/80 px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:shadow-lg hover:border-slate-300 flex items-center justify-center gap-2">
                اكتشف تقنياتنا
                <ChevronDown className="w-5 h-5 animate-bounce" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight">رؤيتنا: هندسة اللقاء المثالي</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                لا نؤمن بالصدف في عالم الأعمال. رؤية <span className="font-bold text-slate-800">Mango AI</span> تتمركز حول حقيقة واحدة: لكل عميل يبحث عن حل، هناك منتج مثالي ينتظره، والعكس صحيح.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-10">
                نحن نبني أنظمة تكنولوجية شديدة التعقيد تعمل كـ "عقل مدبر" يمسح البيانات الضخمة، يحلل سلوكيات السوق، ويجمع الطرفين بدقة جراحية وبشكل آلي بالكامل.
              </p>
              
              <div className="flex items-start gap-4 p-6 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl border border-slate-100/80 shadow-sm">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1 text-lg">الذكاء الاصطناعي التنبؤي</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">محركاتنا تتنبأ باحتياج العميل قبل أن يبدأ رحلة البحث عن الحل، لنوفر له ما يحتاجه في الوقت المثالي.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-tr from-slate-50 to-indigo-50/50 rounded-[3rem] p-8 relative overflow-hidden border border-slate-100 shadow-2xl shadow-indigo-100/50">
                {/* Abstract Tech Representation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-72 h-72 border border-slate-200/80 rounded-full animate-[spin_30s_linear_infinite]" />
                  <div className="w-48 h-48 border border-indigo-200/60 rounded-full absolute animate-[spin_20s_linear_infinite_reverse]" />
                  
                  {/* Center Node */}
                  <div className="absolute z-20 w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center rotate-12 border border-slate-100">
                    <Network className="w-10 h-10 text-orange-500" />
                  </div>
                  
                  {/* Orbiting Nodes */}
                  <div className="absolute top-1/4 left-1/4 w-12 h-12 bg-orange-500 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center animate-bounce delay-75">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-bounce delay-300">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section id="solutions" className="py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">آلية العمل: تبسيط المعقد</h2>
            <p className="text-slate-400 text-xl leading-relaxed">
              خلف الكواليس، تدير خوارزمياتنا ملايين العمليات في الثانية الواحدة لضمان توصيل العميل المناسب بالمنتج المناسب بشكل احترافي وموثوق.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/40 p-10 rounded-[2rem] border border-slate-700/50 backdrop-blur-md hover:bg-slate-800/60 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-8">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">الاستكشاف العميق</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                تقوم العناكب الرقمية بمسح الأسواق وتحليل تقييمات الشركات، لاستخراج نقاط الضعف وتحديد الجهات التي تعاني من مشاكل محددة بدقة جراحية.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/40 p-10 rounded-[2rem] border border-slate-700/50 backdrop-blur-md hover:bg-slate-800/60 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center mb-8">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">المطابقة الذكية</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                يتدخل المحلل الذكي لفهم السياق ونقطة الألم، ليطابقها فورياً مع المنتج أو الخدمة التي تقدم حلاً فعلياً وجذرياً لتلك المشكلة.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-slate-800/40 p-10 rounded-[2rem] border border-slate-700/50 backdrop-blur-md hover:bg-slate-800/60 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-8">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">التواصل الآلي</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                بناء قنوات تواصل مخصصة تعتمد على علم النفس البيعي للتواصل مع الطرف المستهدف، وبناء علاقات متينة نيابة عن عملائنا.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-slate-50 pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 rounded-[3rem] p-16 text-center text-white mb-20 shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">هل أنت مستعد لقيادة المستقبل؟</h2>
              <p className="text-xl text-orange-50 mb-10 max-w-2xl mx-auto leading-relaxed">
                نحن لا نبيع برمجيات، نحن نوفر بنية تحتية حقيقية للتجارة الذكية والروابط العميقة في عالم الأعمال.
              </p>
              <a href="#vision" className="bg-white text-orange-600 hover:bg-orange-50 px-10 py-4 rounded-2xl text-lg font-bold transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
                تعرف على المزيد
              </a>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-200/80 text-slate-500 font-medium">
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
