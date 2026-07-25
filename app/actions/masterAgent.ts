"use server";

import { SuggestedNiche, updateNicheStatus } from '@/services/niches';

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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    // Process rejections
    if (parsed.rejectedNiches && parsed.rejectedNiches.length > 0) {
      for (const rejected of parsed.rejectedNiches) {
        if (rejected.id) {
          await updateNicheStatus(rejected.id, 'REJECTED');
        }
      }
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
