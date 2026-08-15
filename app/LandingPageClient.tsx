"use client";

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Network, Search, Zap, CheckCircle2, ChevronDown, ArrowLeft } from 'lucide-react';

export default function LandingPageClient() {
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-indigo-500/30 selection:text-indigo-200" dir="rtl">
      
      {/* Premium Global Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-[#000000]/50 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">
              Mango AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#vision" className="hover:text-white transition-colors duration-300">الرؤية</a>
            <a href="#technology" className="hover:text-white transition-colors duration-300">التقنية</a>
            <a href="#impact" className="hover:text-white transition-colors duration-300">الأثر</a>
          </div>
          <div className="w-8 h-8">
            {/* Empty space for balance, no admin login button */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Subtle glowing radial gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 w-full flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">البنية التحتية للذكاء الاصطناعي</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-bold tracking-tight text-white leading-[1.1] mb-8 max-w-4xl"
          >
            نحن نجمع الأطراف. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
              بدقة خوارزمية.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-12"
          >
            لا مجال للصدفة في عالم الأعمال. نبني أنظمة تكنولوجية شديدة التعقيد تعمل كعقل مدبر، لربط العميل الذي يبحث عن حل، بالمنتج الذي صُنع من أجله. آلياً وفي أجزاء من الثانية.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="absolute bottom-12 flex justify-center w-full"
            style={{ opacity, y }}
          >
            <a href="#vision" className="p-3 rounded-full border border-white/10 hover:border-white/30 text-white/50 hover:text-white transition-all duration-300 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </a>
          </motion.div>

        </div>
      </section>

      {/* Philosophy Section */}
      <section id="vision" className="py-32 relative border-t border-white/[0.05] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">رؤيتنا: هندسة اللقاء المثالي.</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                نحن لا نقوم بالتسويق. نحن نوفر "بنية تحتية" ذكية. نظامنا يقرأ ملايين البيانات، يستشعر نقاط الألم لدى العملاء والشركات، ويطابقها فحصاً وتدقيقاً مع الحلول الموجودة في السوق.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                النتيجة؟ اتصال حقيقي وفعّال بين طرفين يحتاجان لبعضهما بشدة، دون إهدار للوقت أو الموارد.
              </p>
              
              <ul className="space-y-4">
                {[
                  'تحليل وتنبؤ بسلوكيات السوق المعقدة',
                  'مطابقة جراحية تعتمد على الذكاء الاصطناعي',
                  'أتمتة كاملة لدورة الاتصال وإتمام الشراكات'
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex items-center gap-3 text-slate-300"
                  >
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative aspect-square flex items-center justify-center"
            >
              {/* Abstract Tech Visual */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 rounded-full blur-2xl" />
              <div className="w-[300px] h-[300px] border border-white/5 rounded-full absolute animate-[spin_40s_linear_infinite]" />
              <div className="w-[200px] h-[200px] border border-indigo-500/20 rounded-full absolute animate-[spin_20s_linear_infinite_reverse]" />
              
              <div className="w-24 h-24 bg-black border border-white/10 rounded-2xl flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Network className="w-10 h-10 text-white" />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-32 relative border-t border-white/[0.05] bg-black">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">تقنية تبسط المعقد.</h2>
            <p className="text-slate-400 text-lg">
              خلف واجهتنا الهادئة، تعمل خوارزميات صممت للتعامل مع البيانات الضخمة، لضمان أعلى نسب نجاح في مطابقة الأعمال.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Search className="w-6 h-6 text-white" />,
                title: "الاستكشاف العميق",
                desc: "محركاتنا تمسح الأسواق، تقرأ البيانات المفتوحة، وتستخرج الجهات التي تعاني من فجوات تقنية بانتظار من يسدها."
              },
              {
                icon: <Zap className="w-6 h-6 text-white" />,
                title: "المطابقة الذكية",
                desc: "لا نعتمد على الكلمات المفتاحية فقط. خوارزمياتنا تفهم السياق ونقطة الألم لتربطها بالحل الجذري المناسب لها."
              },
              {
                icon: <Network className="w-6 h-6 text-white" />,
                title: "التواصل الآلي",
                desc: "بناء مسارات تواصل متقدمة نيابة عن عملائنا لفتح أفق الشراكات بشكل طبيعي، دقيق، وفعال."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors duration-500 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/50 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#020202] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center mb-16"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-6">
              <Network className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">مستقبل الأعمال، مبرمج مسبقاً.</h2>
            <p className="text-slate-500 max-w-xl">
              في Mango AI، نحن لا ننتظر المستقبل، بل نبني خوارزمياته.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t border-white/[0.05] text-sm text-slate-500">
            <p>© 2026 Mango AI. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">السياسات</a>
              <a href="#" className="hover:text-white transition-colors">الشروط</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles for Gradient Text Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 8s ease infinite;
        }
      `}} />
    </div>
  );
}
