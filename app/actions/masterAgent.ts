"use server";

import { SuggestedNiche, updateNicheStatus } from '@/services/niches';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function analyzeNichesPortfolio(niches: SuggestedNiche[]) {
  try {
    const prompt = `أنت "مدير التسويق الاستراتيجي العام" (Master Affiliate & Niches AI Agent) في منصة Mango AI.

لديك قائمة بجميع المجالات (Niches) المسجلة في النظام:
${JSON.stringify(niches.map(n => ({ id: n.id, title: n.title, status: n.status, justification: n.justification })), null, 2)}

مهمتك مزدوجة:

أولاً: فلتر الأمان الشرعي والأخلاقي (Ethical & Halal Guardrail)
يُمنع منعاً باتاً أي مجال يتعلق بـ (القمار، الربا، المواقع الإباحية، الاحتيال، الكحول، أو أي منتجات/خدمات محرمة شرعياً وأخلاقياً).
إذا وجدت أي مجال مشبوه ضمن القائمة، أضفه فوراً إلى قائمة المجالات المرفوضة (rejectedNiches) واكتب السبب: "مخالف للضوابط الشرعية والأخلاقية".

ثانياً: التقرير الاستراتيجي (Strategic Report)
للمجالات المتبقية (المعتمدة والنظيفة حصرياً):
1. قم بتقييم شامل للمجالات الحالية.
2. حدد أي المجالات القديمة تحتاج إلى تجديد الاستهداف أو تغيير الزاوية.
3. حدد أي المجالات الجديدة يجب البدء بها فوراً.
4. اقترح استراتيجية حملات مخصصة بناءً على حالة كل مجال.
اكتب التقرير بصيغة Markdown، بأسلوب احترافي، فخم، ومباشر.

يجب أن يكون ردك بصيغة JSON فقط بهذا الهيكل الدقيق:
{
  "rejectedNiches": [
    { "id": "رقم المجال", "reason": "سبب الرفض" }
  ],
  "strategyReport": "نص التقرير الاستراتيجي بصيغة ماركداون"
}`;

    const { chatWithTeamMember, continueChatWithSearch } = await import('@/app/actions/team');
    const { logSmartError } = await import('@/app/actions/monitor');

    let finalResponseText = '';

    try {
      const chatRes = await chatWithTeamMember('master_agent', prompt);
      if (!chatRes.success) {
        throw new Error(chatRes.error || "Server Error from Master Agent");
      }

      finalResponseText = chatRes.response || '';

      if (chatRes.isSearching) {
        const fullHistoryForSearch = [{ role: 'user' as const, content: prompt }];
        const searchRes = await continueChatWithSearch('master_agent', fullHistoryForSearch, chatRes.assistantMessage, chatRes.query || '');
        if (!searchRes.success) {
          throw new Error(searchRes.error || "Server Error during search");
        }
        finalResponseText = searchRes.response || '';
      }

      if (!finalResponseText) {
        throw new Error("لم يرجع المستشار الاستراتيجي أي بيانات.");
      }
    } catch (chatError: any) {
      await logSmartError("Autopilot (MasterAgent) Error: " + (chatError.message || "Unknown error"));
      throw chatError;
    }

    const cleanText = finalResponseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleanText);

    // Process rejections
    if (parsed.rejectedNiches && parsed.rejectedNiches.length > 0) {
      for (const rejected of parsed.rejectedNiches) {
        if (rejected.id) {
          await updateNicheStatus(rejected.id, 'REJECTED');
        }
      }
    }

    // Save report to Firestore
    if (parsed.strategyReport) {
      await addDoc(collection(db, 'strategic_reports'), {
        report: parsed.strategyReport,
        rejectedCount: parsed.rejectedNiches?.length || 0,
        createdAt: serverTimestamp()
      });
    }

    return { 
      success: true, 
      report: parsed.strategyReport, 
      rejectedCount: parsed.rejectedNiches?.length || 0 
    };

  } catch (error: any) {
    console.error("Master Agent Error:", error);
    return { success: false, error: error.message || "فشل تحليل المجالات" };
  }
}
