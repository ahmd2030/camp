"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Send, CheckCircle, Brain, MessageSquare, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  source: string;
}

export default function TrainingPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTrainingState = async () => {
    try {
      const res = await fetch("/api/training");
      const data = await res.json();
      setKnowledge(data.knowledge || []);
      setCurrentQuestion(data.nextQuestion);
      setProgress(data.progress || 0);
      setIsComplete(data.isComplete || false);
      setAnsweredCount(data.answeredCount || 0);
      setTotalQuestions(data.totalQuestions || 10);
    } catch (e) {
      toast.error("فشل في تحميل بيانات التدريب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrainingState(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [knowledge, currentQuestion]);

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !currentQuestion) return;
    setSending(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, answer: answerText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ الإجابة بنجاح!");
        setAnswerText("");
        setCurrentQuestion(data.nextQuestion);
        setProgress(data.progress);
        setIsComplete(data.isComplete);
        setAnsweredCount(data.answeredCount);
        // Re-fetch to update knowledge list
        await fetchTrainingState();
      } else {
        toast.error("خطأ: " + data.error);
      }
    } catch (e: any) {
      toast.error("فشل في الحفظ: " + e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">تدريب النظام</h1>
            <p className="text-slate-500 font-medium mt-1">علّم الذكاء الاصطناعي عن شركتك ليرد على العملاء بذكاء حقيقي</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              مستوى المعرفة
            </span>
            <span className="text-sm font-bold text-indigo-600">{answeredCount}/{totalQuestions} أسئلة</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: progress + "%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {isComplete && (
            <div className="mt-3 flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              التدريب الأساسي مكتمل! الذكاء الاصطناعي جاهز للرد تلقائياً.
            </div>
          )}
        </div>
      </div>

      {/* Chat-like Training Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            جلسة التدريب
          </h2>
        </div>

        <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">
          {/* Previously answered questions */}
          {knowledge.filter(k => k.source === "training").map((entry, i) => (
            <div key={entry.id} className="space-y-3">
              {/* AI Question */}
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-none px-5 py-3 max-w-[80%]">
                  <p className="text-sm font-medium text-slate-700">{entry.question}</p>
                </div>
              </div>
              {/* Owner Answer */}
              <div className="flex gap-3 justify-end">
                <div className="bg-emerald-600 text-white rounded-2xl rounded-tl-none px-5 py-3 max-w-[80%]">
                  <p className="text-sm font-medium whitespace-pre-wrap">{entry.answer}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-bold shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}

          {/* Current Question */}
          {currentQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl rounded-tr-none px-5 py-4 max-w-[80%] shadow-sm">
                  <p className="text-sm font-bold text-indigo-800">{currentQuestion}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Training Complete */}
          {isComplete && !currentQuestion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">التدريب مكتمل!</h3>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                الذكاء الاصطناعي الآن يملك كل المعلومات التي يحتاجها. سيرد تلقائياً على العملاء بناءً على إجاباتك.
              </p>
              <p className="text-sm text-slate-400 mt-3">يمكنك دائماً العودة وإضافة معلومات جديدة.</p>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Answer Input */}
        {currentQuestion && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex gap-3">
              <textarea
                ref={answerRef}
                rows={3}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnswer();
                  }
                }}
                placeholder="اكتب إجابتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 resize-none bg-white"
                dir="rtl"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={sending || !answerText.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shrink-0 transition shadow-sm self-end"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge Base Summary */}
      {knowledge.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            قاعدة المعرفة ({knowledge.length} معلومة محفوظة)
          </h3>
          <div className="space-y-3">
            {knowledge.map((entry) => (
              <details key={entry.id} className="border border-slate-100 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 hover:bg-slate-100 transition">
                  {entry.question}
                </summary>
                <div className="px-4 py-3 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100">
                  {entry.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
