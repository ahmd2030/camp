"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, Users, Briefcase, TrendingUp, ShieldCheck, ServerCog, Send, CheckCircle2, Loader2, Bot, ArrowRight, Forward, XCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBoardMemberOpinion, saveBoardMeeting, delegateToTeamMember, continueChatWithSearch } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';
import { toast, Toaster } from 'sonner';

const BOARD_MEMBERS = [
  { id: 'cmo', title: 'مدير التسويق (CMO)', icon: <TrendingUp className="w-6 h-6 text-orange-500" /> },
  { id: 'cfo', title: 'المحلل المالي (CFO)', icon: <Briefcase className="w-6 h-6 text-blue-500" /> },
  { id: 'cso', title: 'المستشار الاستراتيجي (CSO)', icon: <ShieldCheck className="w-6 h-6 text-green-500" /> },
  { id: 'coo', title: 'مدير النظام (COO/CTO)', icon: <ServerCog className="w-6 h-6 text-slate-500" /> }
];

export default function BoardroomPage() {
  const [topic, setTopic] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(BOARD_MEMBERS.map(m => m.id)));
  const [meetingState, setMeetingState] = useState<'IDLE' | 'RUNNING' | 'DONE'>('IDLE');
  
  // Track status per member: 'WAITING' | 'THINKING' | 'SEARCHING' | 'EMAIL_DRAFT' | 'DONE' | 'ERROR'
  const [memberStatus, setMemberStatus] = useState<Record<string, { status: string, response?: string, query?: string, emailData?: any, isSending?: boolean }>>({});

  // Delegation State
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [delegateContextText, setDelegateContextText] = useState('');
  const [delegateTarget, setDelegateTarget] = useState('cmo');
  const [delegateInstruction, setDelegateInstruction] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  
  const router = useRouter();

  const toggleMember = (id: string) => {
    if (meetingState !== 'IDLE') return;
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMembers(newSelection);
  };

  const startMeeting = async () => {
    if (!topic.trim()) {
      toast.error('الرجاء إدخال موضوع النقاش');
      return;
    }
    if (selectedMembers.size === 0) {
      toast.error('الرجاء اختيار موظف واحد على الأقل');
      return;
    }

    setMeetingState('RUNNING');
    const initialStatus: Record<string, { status: string }> = {};
    selectedMembers.forEach(id => {
      initialStatus[id] = { status: 'THINKING' };
    });
    setMemberStatus(initialStatus);

    const responses: Record<string, string> = {};

    // Parallel execution on client-side to avoid server timeout
    const promises = Array.from(selectedMembers).map(async (roleId) => {
      try {
        let result = await getBoardMemberOpinion(roleId, topic);
        
        if (result.success && result.isSearching) {
          setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'SEARCHING', query: result.query } }));
          result = await continueChatWithSearch(roleId, [], result.assistantMessage, result.query, topic);
        }

        if (result.success && result.isEmailDraft) {
          setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'EMAIL_DRAFT', emailData: result.emailData } }));
          return;
        }

        if (result.success && result.response) {
          responses[roleId] = result.response;
          setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'DONE', response: result.response } }));
        } else {
          setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'ERROR', response: result.error || 'حدث خطأ' } }));
        }
      } catch (err) {
        setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'ERROR', response: 'فشل الاتصال' } }));
      }
    });

    await Promise.all(promises);

    // Meeting Finished, save to DB
    if (Object.keys(responses).length > 0) {
      await saveBoardMeeting(topic, responses);
      toast.success('اكتمل اجتماع مجلس الإدارة وتم حفظ النتائج');
    }
    
    setMeetingState('DONE');
  };

  const handleOpenDelegate = (messageContent: string) => {
    setDelegateContextText(messageContent);
    setIsDelegateModalOpen(true);
    setDelegateInstruction('');
  };

  const handleDelegateSubmit = async () => {
    if (!delegateTarget || !delegateInstruction.trim()) return;
    setIsDelegating(true);

    const fullMessage = `[تقرير مُحال من زميل آخر في مجلس الإدارة]:\n${delegateContextText}\n\n[أوامر وتوجيهات المدير لك]:\n${delegateInstruction}`;

    try {
      const result = await delegateToTeamMember(delegateTarget, fullMessage);
      if (result.success) {
        toast.success('تمت إحالة المهمة بنجاح! يتم توجيهك الآن...');
        setIsDelegateModalOpen(false);
        router.push(`/team?member=${delegateTarget}`);
      } else {
        toast.error('فشل في الإحالة: ' + result.error);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الإحالة.');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleApproveEmail = async (roleId: string, emailData: any) => {
    setMemberStatus(prev => ({ ...prev, [roleId]: { ...prev[roleId], isSending: true } }));
    try {
      const res = await executeEmailAction(emailData.to_email, emailData.subject, emailData.body);
      if (res.success) {
        toast.success('تم الإرسال بنجاح!');
        setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'DONE', response: `[نجاح] تم إرسال رسالة البريد الإلكتروني إلى ${emailData.to_email} بنجاح.` } }));
      } else {
        toast.error('فشل الإرسال: ' + res.error);
        setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'DONE', response: `[فشل] لم أتمكن من إرسال البريد: ${res.error}` } }));
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الإرسال');
      setMemberStatus(prev => ({ ...prev, [roleId]: { ...prev[roleId], isSending: false } }));
    }
  };

  const handleDenyEmail = (roleId: string) => {
    setMemberStatus(prev => ({ ...prev, [roleId]: { status: 'DONE', response: 'تم رفض إرسال رسالة البريد الإلكتروني.' } }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans -m-8" dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/team" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Presentation className="w-8 h-8 text-orange-500" />
              غرفة مجلس الإدارة (The Boardroom)
            </h1>
            <p className="text-slate-500 mt-2">اتخذ قرارات استراتيجية مصيرية بالتشاور مع كبار الخبراء في نفس اللحظة</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Meeting Setup Area */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4">موضوع النقاش أو القرار</h3>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={meetingState === 'RUNNING'}
              placeholder="مثال: أريد إطلاق حملة تسويقية بنصف الميزانية الحالية، وتوظيف 5 مسوقين جدد، واستخدام سيرفرات إضافية لتسريع السحب."
              className="w-full h-40 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none mb-6 shadow-inner disabled:opacity-60"
            />

            <h3 className="text-lg font-bold text-slate-800 mb-4">الاستدعاء الانتقائي (من سيحضر؟)</h3>
            <div className="space-y-3 mb-8">
              {BOARD_MEMBERS.map(member => (
                <div 
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${selectedMembers.has(member.id) ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} ${meetingState === 'RUNNING' ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {member.icon}
                    </div>
                    <span className={`font-semibold ${selectedMembers.has(member.id) ? 'text-orange-700' : 'text-slate-600'}`}>
                      {member.title}
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${selectedMembers.has(member.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                    {selectedMembers.has(member.id) && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startMeeting}
              disabled={meetingState === 'RUNNING' || selectedMembers.size === 0 || !topic.trim()}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white px-6 py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {meetingState === 'RUNNING' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  الاجتماع منعقد...
                </>
              ) : (
                <>
                  <Users className="w-6 h-6" />
                  بدء الاجتماع
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Meeting Results Area */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {meetingState !== 'IDLE' && Array.from(selectedMembers).map((roleId, index) => {
              const member = BOARD_MEMBERS.find(m => m.id === roleId);
              const statusData = memberStatus[roleId];
              
              if (!member || !statusData) return null;

              return (
                <motion.div
                  key={roleId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden"
                >
                  {/* Progress / Status Bar */}
                  {(statusData.status === 'THINKING' || statusData.status === 'SEARCHING') && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
                      <div className={`h-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite] ${statusData.status === 'SEARCHING' ? 'bg-orange-500' : 'bg-orange-400'}`} />
                    </div>
                  )}

                  <div className="flex gap-6">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                      {member.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{member.title}</h3>
                        {statusData.status === 'THINKING' && (
                          <span className="text-sm font-semibold text-orange-500 animate-pulse flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            يحلل المعطيات...
                          </span>
                        )}
                        {statusData.status === 'SEARCHING' && (
                          <span className="text-sm font-semibold text-orange-600 animate-pulse flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                            🔍 يبحث في الإنترنت عن: "{statusData.query}"...
                          </span>
                        )}
                        {statusData.status === 'DONE' && (
                          <span className="text-sm font-bold text-green-500 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                            تم الرد
                          </span>
                        )}
                        {statusData.status === 'ERROR' && (
                          <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                            فشل الرد
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        {(statusData.status === 'THINKING' || statusData.status === 'SEARCHING') ? (
                          <div className="space-y-3">
                            <div className="h-2 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                            <div className="h-2 bg-slate-100 rounded-full w-full animate-pulse" />
                            <div className="h-2 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                          </div>
                        ) : statusData.status === 'DONE' ? (
                          <div className="space-y-4">
                            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{statusData.response}</div>
                            
                            <div className="pt-4 border-t border-slate-100 flex gap-2">
                              <button 
                                onClick={() => handleOpenDelegate(statusData.response || '')}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-slate-100 hover:border-indigo-100"
                              >
                                <Forward className="w-3.5 h-3.5" />
                                إحالة لزميل
                              </button>
                            </div>
                          </div>
                        ) : statusData.status === 'EMAIL_DRAFT' && statusData.emailData ? (
                          <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm mt-2">
                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                              <Mail className="w-5 h-5 text-indigo-500" />
                              اقتراح إرسال بريد إلكتروني
                            </h4>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 space-y-2 text-sm">
                              <div className="flex gap-2">
                                <span className="text-slate-500 font-bold w-16">إلى:</span>
                                <span className="text-slate-800 font-medium">{statusData.emailData.to_email}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-slate-500 font-bold w-16">الموضوع:</span>
                                <span className="text-slate-800 font-medium">{statusData.emailData.subject}</span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 mt-2">
                                <span className="text-slate-500 font-bold block mb-2">المحتوى:</span>
                                <div className="text-slate-700 bg-white p-3 rounded-lg border border-slate-100 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: statusData.emailData.body }}></div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApproveEmail(member.id, statusData.emailData)}
                                disabled={statusData.isSending}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg transition-all shadow-sm flex justify-center items-center disabled:opacity-50 text-sm"
                              >
                                {statusData.isSending ? 'جاري الإرسال...' : 'اعتماد وإرسال ✅'}
                              </button>
                              <button
                                onClick={() => handleDenyEmail(member.id)}
                                disabled={statusData.isSending}
                                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2 px-3 rounded-lg transition-all border border-rose-100 flex justify-center items-center disabled:opacity-50 text-sm"
                              >
                                رفض ❌
                              </button>
                            </div>
                          </div>
                        ) : statusData.status === 'ERROR' ? (
                          <div className="text-rose-500 font-medium bg-rose-50 p-4 rounded-xl border border-rose-100">
                            {statusData.response}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {meetingState === 'IDLE' && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Presentation className="w-20 h-20 mb-4 text-slate-300" />
              <p className="text-xl font-medium text-slate-500">غرفة الاجتماعات فارغة</p>
              <p className="text-sm mt-2 max-w-md text-center">أدخل موضوع النقاش، حدد أعضاء مجلس الإدارة، واضغط على "بدء الاجتماع" للحصول على تقييماتهم بشكل متزامن.</p>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide {
          0% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }
      `}} />
      
      {/* Delegation Modal */}
      <AnimatePresence>
        {isDelegateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 p-6 md:p-8 relative"
            >
              <button 
                onClick={() => setIsDelegateModalOpen(false)}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                disabled={isDelegating}
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <Forward className="w-7 h-7 text-orange-500" />
                إحالة المهمة (Delegation)
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">النص المُحال:</label>
                  <div className="bg-slate-50 text-slate-600 p-4 rounded-xl text-sm border border-slate-200 h-32 overflow-y-auto whitespace-pre-wrap">
                    {delegateContextText}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">إلى الموظف المستهدف:</label>
                  <select 
                    value={delegateTarget} 
                    onChange={e => setDelegateTarget(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer font-medium"
                    disabled={isDelegating}
                  >
                    {BOARD_MEMBERS.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                    {/* Add any non-board members if needed, or stick to board members */}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">أوامرك وتوجيهاتك:</label>
                  <textarea 
                    value={delegateInstruction}
                    onChange={e => setDelegateInstruction(e.target.value)}
                    placeholder="اكتب توجيهاتك للموظف الجديد هنا ليعمل على هذا التقرير..."
                    className="w-full h-32 bg-white border border-slate-300 text-slate-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none font-medium leading-relaxed"
                    disabled={isDelegating}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsDelegateModalOpen(false)}
                    disabled={isDelegating}
                    className="px-6 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleDelegateSubmit}
                    disabled={isDelegating || !delegateInstruction.trim()}
                    className="px-6 py-3 text-white bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {isDelegating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    إرسال وإحالة
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
