"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, Zap, Search, BrainCircuit, ChevronDown, 
  Target, ShieldCheck, HeartHandshake, ArrowRight,
  Activity, Globe, X, Send, Loader2
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- TRANSLATIONS DICTIONARY ---
const translations = {
  ar: {
    nav: {
      about: "من نحن",
      vision: "الرؤية",
      solutions: "الحلول التقنية",
      howItWorks: "آلية العمل",
    },
    hero: {
      badge: "البنية التحتية لتجارة المستقبل",
      title1: "التكنولوجيا المعقدة لصناعة",
      title2: "الصلات البسيطة.",
      desc: "نحن لا ننتظر العملاء، بل نصنع لهم مساراً للوصول إليك. خوارزمياتنا تحلل السوق، ترصد الفجوات، وتجمع الأطراف المحتاجة لبعضها في اللحظة المناسبة، لنجعل المستحيل ممكناً.",
      cta: "اكتشف ثورتنا التقنية",
    },
    about: {
      title: "من نحن؟",
      subtitle: "شريكك التقني الاستراتيجي",
      desc1: "نحن لسنا مجرد أداة تسويقية. نحن فريق من مهندسي البيانات وخبراء الذكاء الاصطناعي، اجتمعنا لإنهاء العشوائية في سوق المبيعات العالمي.",
      desc2: "نمثل الجيل الجديد من البنية التحتية الذكية للأعمال. في Mangos، نؤمن بأن البحث اليدوي عن العملاء هو مضيعة لوقت العقول المبدعة.",
      desc3: "لذلك قمنا ببناء أنظمة فائقة الذكاء، لا تبحث عن العملاء فحسب، بل \"تفهمهم\"، وتحلل احتياجاتهم، وتصنع لهم المسار ليأتوا إليك وهم في أشد الحاجة لما تقدمه.",
      stat1Val: "+١٠ مليون",
      stat1Text: "نقطة بيانات محللة يومياً",
      stat2Val: "١٠٠٪",
      stat2Text: "أتمتة لعملية الربط التجاري",
    },
    problem: {
      title: "لماذا Mangos؟",
      desc: "الطرق التقليدية لم تعد تجدي نفعاً. نحن نعيد ابتكار قواعد اللعبة بالكامل لضمان نمو أعمالك.",
      oldWay: "الطريقة القديمة (العشوائية)",
      old1: "إعلانات ممولة مكلفة تصل لجمهور غير مهتم.",
      old2: "رسائل بريدية عشوائية تعتبر مزعجة (Spam).",
      old3: "هدر للوقت والجهد في البحث اليدوي عن الفرص.",
      newWay: "طريقة Mangos (الذكية)",
      new1: "استهداف مبني على احتياج حقيقي (نقطة ألم) رُصدت آلياً.",
      new2: "رسائل مخصصة سيكولوجياً تُكتب لكل عميل بلمسة بشرية.",
      new3: "نظام يعمل على مدار الساعة ليجلب لك صفقات جاهزة للإغلاق.",
    },
    features: {
      title: "ميزات تقنية تصنع الفارق",
      desc: "خلف الكواليس، قمنا بهندسة أدوات ذكية تجعل من المستحيل على المنافسين اللحاق بك.",
      f1Title: "التنقيب الآلي للعملاء",
      f1Desc: "محركاتنا تستخرج آلاف الفرص التجارية غير المستغلة في ثوانٍ معدودة. نراقب التقييمات، والشكاوى، ونرصد الفجوات التي يتركها المنافسون.",
      f2Title: "الفلترة الجراحية",
      f2Desc: "لا نجمع أرقاماً فارغة. خوارزمياتنا تستبعد الجهات غير المتوافقة والتي لا تلبي معايير الجودة، لضمان وصولك إلى العملاء ذوي القيمة العالية فقط.",
      f3Title: "تحليل المشاعر (Sentiment Analysis)",
      f3Desc: "يفهم نظامنا الحالة النفسية للعميل المستهدف بناءً على لغته الرقمية وتوجهاته، لتهيئة أفضل بيئة ممكنة لبدء النقاش وعقد الصفقة.",
      f4Title: "بناء العلاقات الآلي",
      f4Desc: "نحن لا نرسل روابط تسويقية مزعجة. نظامنا يفتح حوارات استكشافية حقيقية، ويبني ثقة تدريجية تنتهي بطلب العميل لخدمتك بنفسه."
    },
    how: {
      title: "كيف نبدأ؟ ببساطة مطلقة.",
      desc: "تخلصنا من كل التعقيدات التقنية، لتتفرغ أنت لإدارة أعمالك.",
      s1: "١",
      s1Title: "أخبرنا بهدفك",
      s1Desc: "ببساطة، أدخل رابط المنتج أو الخدمة التي تقدمها، واترك الباقي لنا.",
      s2: "٢",
      s2Title: "محركاتنا تنطلق",
      s2Desc: "يقوم الذكاء الاصطناعي بمسح السوق العالمي والمحلي لإيجاد الفئة المتعطشة لما تقدمه.",
      s3: "٣",
      s3Title: "استقبل الشراكات",
      s3Desc: "يتم التواصل مع العملاء آلياً، وتستلم طلبات حقيقية من عملاء جاهزين للإغلاق.",
    },
    cta: {
      title: "هل أنت مستعد لقيادة المستقبل؟",
      desc: "قادرون على جلب مئات البيانات لعملاء محتملين مهتمين بمجالك بدقة عالية.",
      button: "تواصل معنا",
    },
    footer: {
      rights: "© 2026 Mangos. جميع الحقوق محفوظة للأنظمة التكنولوجية المعقدة."
    },
    modal: {
      title: "تواصل معنا",
      subtitle: "دعنا نبني جسوراً لعملائك المحتملين.",
      name: "الاسم الكامل",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      niche: "مجال العمل / المنتج",
      message: "رسالتك (اختياري)",
      send: "إرسال الطلب",
      sending: "جاري الإرسال...",
      success: "تم استلام طلبك بنجاح! سيقوم فريقنا بالتواصل معك في أقرب وقت ممكن عبر البريد الإلكتروني أو رقم الهاتف المرفق.",
      error: "حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.",
      close: "إغلاق"
    }
  },
  en: {
    nav: {
      about: "About Us",
      vision: "Vision",
      solutions: "Solutions",
      howItWorks: "How it Works",
    },
    hero: {
      badge: "The Infrastructure of Future Commerce",
      title1: "Complex Technology for",
      title2: "Simple Connections.",
      desc: "We don't wait for clients; we build the path for them to reach you. Our algorithms analyze the market, spot gaps, and connect parties in need at the perfect moment.",
      cta: "Discover Our Tech Revolution",
    },
    about: {
      title: "Who Are We?",
      subtitle: "Your Strategic Tech Partner",
      desc1: "We are not just a marketing tool. We are a team of data engineers and AI experts, gathered to end the chaos in the global sales market.",
      desc2: "We represent the new generation of smart business infrastructure. At Mangos, we believe manual prospecting is a waste of creative minds.",
      desc3: "That's why we built hyper-intelligent systems that don't just find clients, but \"understand\" them, analyze their needs, and pave the way for them to come to you.",
      stat1Val: "+10 Million",
      stat1Text: "Data points analyzed daily",
      stat2Val: "100%",
      stat2Text: "Automated business matchmaking",
    },
    problem: {
      title: "Why Mangos?",
      desc: "Traditional methods no longer work. We are completely reinventing the rules of the game.",
      oldWay: "The Old Way (Random)",
      old1: "Expensive paid ads reaching uninterested audiences.",
      old2: "Random cold emails marked as Spam.",
      old3: "Wasted time and effort in manual prospecting.",
      newWay: "The Mangos Way (Smart)",
      new1: "Targeting based on real, automatically detected pain points.",
      new2: "Psychologically tailored messages written with a human touch.",
      new3: "A 24/7 system bringing you deals ready to close.",
    },
    features: {
      title: "Features that Make a Difference",
      desc: "Behind the scenes, we've engineered smart tools making it impossible for competitors to catch up.",
      f1Title: "Automated Prospecting",
      f1Desc: "Our engines extract thousands of untapped business opportunities in seconds. We monitor reviews and spot gaps left by competitors.",
      f2Title: "Surgical Filtering",
      f2Desc: "We don't collect empty numbers. Our algorithms exclude incompatible leads, ensuring you only get high-value clients.",
      f3Title: "Sentiment Analysis",
      f3Desc: "Our system understands the psychological state of the target client based on their digital footprint, preparing the best environment to close the deal.",
      f4Title: "Automated Relationship Building",
      f4Desc: "We don't send spam links. Our system opens real exploratory dialogues, building gradual trust until the client requests your service."
    },
    how: {
      title: "How to Start? Absolute Simplicity.",
      desc: "We removed all technical complexities so you can focus on managing your business.",
      s1: "1",
      s1Title: "Tell Us Your Goal",
      s1Desc: "Simply enter the link to your product or service, and leave the rest to us.",
      s2: "2",
      s2Title: "Our Engines Start",
      s2Desc: "The AI scans the global and local markets to find the audience thirsty for what you offer.",
      s3: "3",
      s3Title: "Receive Partnerships",
      s3Desc: "Clients are contacted automatically, and you receive real requests from ready-to-close leads.",
    },
    cta: {
      title: "Ready to Lead the Future?",
      desc: "We are capable of bringing hundreds of data points for potential clients interested in your niche with high precision.",
      button: "Contact Us",
    },
    footer: {
      rights: "© 2026 Mangos. All rights reserved for complex technological systems."
    },
    modal: {
      title: "Contact Us",
      subtitle: "Let's build bridges to your potential clients.",
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      niche: "Industry / Product",
      message: "Your Message (Optional)",
      send: "Submit Request",
      sending: "Sending...",
      success: "Your request has been received successfully! Our team will contact you as soon as possible via the provided email or phone number.",
      error: "An error occurred while sending. Please try again later.",
      close: "Close"
    }
  }
};

export default function LandingPageClient() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'ar'|'en'>('ar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    niche: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle'|'success'|'error'>('idle');

  useEffect(() => {
    // Detect browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ar')) {
      setLang('ar');
    } else {
      setLang('en');
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const t = translations[lang];
  const isRTL = lang === 'ar';

  const toggleLanguage = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await addDoc(collection(db, 'contact_messages'), {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerNiche: formData.niche,
        message: formData.message || 'No specific message',
        type: 'inquiry',
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', niche: '', message: '' });
      setTimeout(() => setIsModalOpen(false), 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };
  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className={`min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-orange-200 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/login" className="w-12 h-12 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" title={isRTL ? "دخول النظام" : "System Login"}>
              <img src="/logo.jpg" alt="Mangos Logo" className="w-full h-full object-contain rounded-xl shadow-lg shadow-orange-500/10" />
            </a>
            <span className="text-2xl font-black bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Mangos
            </span>
          </div>
          <div className="hidden md:flex gap-10 font-semibold text-slate-600">
            <a href="#about" className="hover:text-orange-500 transition-colors">{t.nav.about}</a>
            <a href="#vision" className="hover:text-orange-500 transition-colors">{t.nav.vision}</a>
            <a href="#solutions" className="hover:text-orange-500 transition-colors">{t.nav.solutions}</a>
            <a href="#how-it-works" className="hover:text-orange-500 transition-colors">{t.nav.howItWorks}</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors font-bold text-sm text-slate-600"
            >
              <Globe className="w-4 h-4" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden flex flex-col justify-center min-h-[95vh]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-200 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="text-center max-w-4xl mx-auto">
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-slate-200/60 px-5 py-2.5 rounded-full mb-8 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-700 tracking-wide">{t.hero.badge}</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              {t.hero.title1}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 block mt-3 pb-2">
                {t.hero.title2}
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              {t.hero.desc}
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex justify-center gap-4">
              <a href="#about" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:shadow-xl flex items-center justify-center gap-2">
                {t.hero.cta}
                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-24 bg-white relative border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="relative rounded-[3rem] overflow-hidden bg-slate-50 border border-slate-100 p-12 aspect-square flex flex-col justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent" />
              <div className="relative z-10">
                <Network className="w-16 h-16 text-orange-500 mb-8" />
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{t.about.subtitle}</h3>
                <p className="text-lg text-slate-600 leading-relaxed">{t.about.desc1}</p>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: isRTL ? -50 : 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 tracking-tight">{t.about.title}</h2>
              <p className="text-xl text-slate-600 leading-relaxed mb-6">{t.about.desc2}</p>
              <p className="text-xl text-slate-600 leading-relaxed mb-10">{t.about.desc3}</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className={`border-orange-500 ${isRTL ? 'border-r-4 pr-6' : 'border-l-4 pl-6'}`}>
                  <h4 className="text-3xl font-bold text-slate-900 mb-1">{t.about.stat1Val}</h4>
                  <p className="text-slate-500 font-medium">{t.about.stat1Text}</p>
                </div>
                <div className={`border-indigo-500 ${isRTL ? 'border-r-4 pr-6' : 'border-l-4 pl-6'}`}>
                  <h4 className="text-3xl font-bold text-slate-900 mb-1">{t.about.stat2Val}</h4>
                  <p className="text-slate-500 font-medium">{t.about.stat2Text}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-32 bg-slate-900 text-white relative overflow-hidden" id="vision">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">{t.problem.title}</h2>
            <p className="text-slate-400 text-xl leading-relaxed">{t.problem.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-red-500/5 border border-red-500/20 p-10 rounded-[2rem]">
              <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t.problem.oldWay}</h3>
              <ul className="space-y-4">
                {[t.problem.old1, t.problem.old2, t.problem.old3].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-400">
                    <span className="text-red-400 mt-1">✗</span> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-indigo-500/10 border border-indigo-500/30 p-10 rounded-[2rem] relative overflow-hidden">
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 relative z-10">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{t.problem.newWay}</h3>
              <ul className="space-y-4 relative z-10">
                {[t.problem.new1, t.problem.new2, t.problem.new3].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="text-indigo-400 mt-1">✓</span> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expanded Features */}
      <section id="solutions" className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t.features.title}</h2>
            <p className="text-slate-600 text-xl leading-relaxed">{t.features.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: <Target className="text-blue-500" />, title: t.features.f1Title, desc: t.features.f1Desc },
              { icon: <ShieldCheck className="text-green-500" />, title: t.features.f2Title, desc: t.features.f2Desc },
              { icon: <BrainCircuit className="text-purple-500" />, title: t.features.f3Title, desc: t.features.f3Desc },
              { icon: <HeartHandshake className="text-orange-500" />, title: t.features.f4Title, desc: t.features.f4Desc }
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="bg-white p-10 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 group">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 [&>svg]:w-8 [&>svg]:h-8 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-lg">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t.how.title}</h2>
            <p className="text-slate-600 text-xl leading-relaxed">{t.how.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-orange-200 via-indigo-200 to-orange-200" />
            {[
              { step: t.how.s1, title: t.how.s1Title, desc: t.how.s1Desc },
              { step: t.how.s2, title: t.how.s2Title, desc: t.how.s2Desc },
              { step: t.how.s3, title: t.how.s3Title, desc: t.how.s3Desc }
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.2 }} className="relative text-center z-10">
                <div className="w-20 h-20 mx-auto bg-white border-4 border-slate-100 rounded-full flex items-center justify-center text-2xl font-black text-orange-500 mb-8 shadow-xl shadow-slate-200/50">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed text-lg">{step.desc}</p>
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
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight text-white">{t.cta.title}</h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">{t.cta.desc}</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-500 text-white hover:bg-orange-600 px-10 py-4 rounded-2xl text-lg font-bold transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-orange-500/25"
              >
                {t.cta.button}
              </button>
            </div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-200/80 text-slate-500 font-medium">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xl">
              <a href="/login" className="cursor-pointer hover:scale-105 transition-transform">
                <img src="/logo.jpg" alt="Mangos Logo" className="w-8 h-8 object-contain rounded-md" />
              </a>
              Mangos
            </div>
            <p>{t.footer.rights}</p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl relative z-10 w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.modal.title}</h3>
                    <p className="text-slate-500">{t.modal.subtitle}</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {submitStatus === 'success' ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-800">{t.modal.success}</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.modal.name}</label>
                      <input 
                        type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.modal.email}</label>
                      <input 
                        type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-left" dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.modal.phone}</label>
                      <div className="phone-input-wrapper" dir="ltr">
                        <PhoneInput
                          international
                          defaultCountry="SA"
                          value={formData.phone}
                          onChange={(val: string) => setFormData({...formData, phone: val || ''})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 outline-none transition-all flex items-center"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.modal.niche}</label>
                      <input 
                        type="text" required value={formData.niche} onChange={e => setFormData({...formData, niche: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.modal.message}</label>
                      <textarea 
                        rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                      />
                    </div>
                    
                    {submitStatus === 'error' && (
                      <p className="text-red-500 text-sm font-bold">{t.modal.error}</p>
                    )}

                    <button 
                      type="submit" disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {isSubmitting ? t.modal.sending : t.modal.send}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Phone Input Styles Override */}
      <style dangerouslySetInnerHTML={{__html: `
        .phone-input-wrapper .PhoneInputInput {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 1rem;
          margin-left: 10px;
        }
        .phone-input-wrapper .PhoneInputCountry {
          margin-right: 0;
        }
      `}} />
    </div>
  );
}
