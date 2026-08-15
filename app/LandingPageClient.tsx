"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Network, Zap, Search, BrainCircuit, ChevronDown, 
  Target, ShieldCheck, HeartHandshake, ArrowRight,
  TrendingUp, Users, Activity
} from 'lucide-react';

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
      transition: { staggerChildren: 0.1 }
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-orange-200" dir="rtl">
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex items-center justify-center">
              {/* Using standard img tag to avoid next/image domain/optimization config issues for now, since it's local it's fine, but next/image is better if configured. Let's use img for absolute simplicity and guaranteed render */}
              <img src="/logo.jpg" alt="Mango AI Logo" className="w-full h-full object-contain rounded-xl shadow-lg shadow-orange-500/10" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Mango AI
            </span>
          </div>
          <div className="hidden md:flex gap-10 font-semibold text-slate-600">
            <a href="#about" className="hover:text-orange-500 transition-colors">من نحن</a>
            <a href="#vision" className="hover:text-orange-500 transition-colors">الرؤية</a>
            <a href="#solutions" className="hover:text-orange-500 transition-colors">الحلول التقنية</a>
            <a href="#how-it-works" className="hover:text-orange-500 transition-colors">آلية العمل</a>
          </div>
          <div className="w-10 h-10"></div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden flex flex-col justify-center min-h-[95vh]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-200 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        
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
              <span className="text-sm font-bold text-slate-700 tracking-wide">البنية التحتية لتجارة المستقبل</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              التكنولوجيا المعقدة لصناعة
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 block mt-3 pb-2">
                الصلات البسيطة.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              نحن لا ننتظر العملاء، بل نصنع لهم مساراً للوصول إليك. خوارزمياتنا تحلل السوق، ترصد الفجوات، وتجمع الأطراف المحتاجة لبعضها في اللحظة المناسبة، لنجعل المستحيل ممكناً.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex justify-center gap-4">
              <a href="#about" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:shadow-xl flex items-center justify-center gap-2">
                اكتشف ثورتنا التقنية
                <ArrowRight className="w-5 h-5 rotate-180" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Us (من نحن) */}
      <section id="about" className="py-24 bg-white relative border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100 p-12 aspect-square flex flex-col justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent" />
              <div className="relative z-10">
                <Network className="w-16 h-16 text-orange-500 mb-8" />
                <h3 className="text-3xl font-bold text-slate-900 mb-4">شريكك التقني الاستراتيجي</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  نحن لسنا مجرد أداة تسويقية. نحن فريق من مهندسي البيانات وخبراء الذكاء الاصطناعي، اجتمعنا لإنهاء العشوائية في سوق المبيعات العالمي.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight">من نحن؟</h2>
              <p className="text-xl text-slate-600 leading-relaxed mb-6">
                نمثل الجيل الجديد من البنية التحتية الذكية للأعمال. في Mango AI، نؤمن بأن البحث اليدوي عن العملاء هو مضيعة لوقت العقول المبدعة.
              </p>
              <p className="text-xl text-slate-600 leading-relaxed mb-10">
                لذلك قمنا ببناء أنظمة فائقة الذكاء، لا تبحث عن العملاء فحسب، بل "تفهمهم"، وتحلل احتياجاتهم، وتصنع لهم المسار ليأتوا إليك وهم في أشد الحاجة لما تقدمه.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="border-r-4 border-orange-500 pr-6">
                  <h4 className="text-3xl font-bold text-slate-900 mb-1">+١٠ مليون</h4>
                  <p className="text-slate-500 font-medium">نقطة بيانات محللة يومياً</p>
                </div>
                <div className="border-r-4 border-indigo-500 pr-6">
                  <h4 className="text-3xl font-bold text-slate-900 mb-1">١٠٠٪</h4>
                  <p className="text-slate-500 font-medium">أتمتة لعملية الربط التجاري</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">لماذا Mango AI؟</h2>
            <p className="text-slate-400 text-xl leading-relaxed">
              الطرق التقليدية لم تعد تجدي نفعاً. نحن نعيد ابتكار قواعد اللعبة بالكامل لضمان نمو أعمالك.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* The Problem */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-red-500/5 border border-red-500/20 p-10 rounded-[2rem]"
            >
              <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">الطريقة القديمة (العشوائية)</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-slate-400">
                  <span className="text-red-400 mt-1">✗</span> إعلانات ممولة مكلفة تصل لجمهور غير مهتم.
                </li>
                <li className="flex items-start gap-3 text-slate-400">
                  <span className="text-red-400 mt-1">✗</span> رسائل بريدية عشوائية تعتبر مزعجة (Spam).
                </li>
                <li className="flex items-start gap-3 text-slate-400">
                  <span className="text-red-400 mt-1">✗</span> هدر للوقت والجهد في البحث اليدوي عن الفرص.
                </li>
              </ul>
            </motion.div>

            {/* The Solution */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-indigo-500/10 border border-indigo-500/30 p-10 rounded-[2rem] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 relative z-10">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">طريقة Mango AI (الذكية)</h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3 text-slate-300">
                  <span className="text-indigo-400 mt-1">✓</span> استهداف مبني على احتياج حقيقي (نقطة ألم) رُصدت آلياً.
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <span className="text-indigo-400 mt-1">✓</span> رسائل مخصصة سيكولوجياً تُكتب لكل عميل بلمسة بشرية.
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <span className="text-indigo-400 mt-1">✓</span> نظام يعمل على مدار الساعة ليجلب لك صفقات جاهزة للإغلاق.
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expanded Features */}
      <section id="solutions" className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">ميزات تقنية تصنع الفارق</h2>
            <p className="text-slate-600 text-xl leading-relaxed">
              خلف الكواليس، قمنا بهندسة أدوات ذكية تجعل من المستحيل على المنافسين اللحاق بك.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <Target className="text-blue-500" />,
                title: "التنقيب الآلي للعملاء",
                desc: "محركاتنا تستخرج آلاف الفرص التجارية غير المستغلة في ثوانٍ معدودة. نراقب التقييمات، والشكاوى، ونرصد الفجوات التي يتركها المنافسون."
              },
              {
                icon: <ShieldCheck className="text-green-500" />,
                title: "الفلترة الجراحية",
                desc: "لا نجمع أرقاماً فارغة. خوارزمياتنا تستبعد الجهات غير المتوافقة والتي لا تلبي معايير الجودة، لضمان وصولك إلى العملاء ذوي القيمة العالية فقط."
              },
              {
                icon: <BrainCircuit className="text-purple-500" />,
                title: "تحليل المشاعر (Sentiment Analysis)",
                desc: "يفهم نظامنا الحالة النفسية للعميل المستهدف بناءً على لغته الرقمية وتوجهاته، لتهيئة أفضل بيئة ممكنة لبدء النقاش وعقد الصفقة."
              },
              {
                icon: <HeartHandshake className="text-orange-500" />,
                title: "بناء العلاقات الآلي",
                desc: "نحن لا نرسل روابط تسويقية مزعجة. نظامنا يفتح حوارات استكشافية حقيقية، ويبني ثقة تدريجية تنتهي بطلب العميل لخدمتك بنفسه."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-10 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 [&>svg]:w-8 [&>svg]:h-8 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">كيف نبدأ؟ ببساطة مطلقة.</h2>
            <p className="text-slate-600 text-xl leading-relaxed">
              تخلصنا من كل التعقيدات التقنية، لتتفرغ أنت لإدارة أعمالك.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-orange-200 via-indigo-200 to-orange-200" />
            
            {[
              {
                step: "١",
                title: "أخبرنا بهدفك",
                desc: "ببساطة، أدخل رابط المنتج أو الخدمة التي تقدمها، واترك الباقي لنا."
              },
              {
                step: "٢",
                title: "محركاتنا تنطلق",
                desc: "يقوم الذكاء الاصطناعي بمسح السوق العالمي والمحلي لإيجاد الفئة المتعطشة لما تقدمه."
              },
              {
                step: "٣",
                title: "استقبل الشراكات",
                desc: "يتم التواصل مع العملاء آلياً، وتستلم طلبات حقيقية من عملاء جاهزين للإغلاق."
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="relative text-center z-10"
              >
                <div className="w-20 h-20 mx-auto bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-2xl font-black text-orange-500 mb-8 shadow-xl shadow-slate-200/50">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-slate-50 pt-32 pb-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[3rem] p-16 text-center text-white mb-20 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight text-white">هل أنت مستعد لقيادة المستقبل؟</h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                لا تدع منافسيك يسبقونك إلى التكنولوجيا. انضم إلى عالم Mango AI وابدأ في حصد نتائج حقيقية ومستدامة.
              </p>
              <a href="mailto:contact@mangosai.co" className="bg-orange-500 text-white hover:bg-orange-600 px-10 py-4 rounded-2xl text-lg font-bold transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-orange-500/25">
                تواصل معنا لبناء شراكة
              </a>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-200/80 text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xl">
              <img src="/logo.jpg" alt="Mango AI Logo" className="w-8 h-8 object-contain rounded-md" />
              Mango AI
            </div>
            <p>© 2026 Mango AI. جميع الحقوق محفوظة للأنظمة التكنولوجية المعقدة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
