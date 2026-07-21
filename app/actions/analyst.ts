"use server";

import { getActiveNiches, addNiches, SuggestedNiche } from "@/services/niches";

export async function getAndFillNiches(): Promise<{ success: boolean; niches?: SuggestedNiche[]; error?: string }> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'مفتاح GOOGLE_GENERATIVE_AI_API_KEY مفقود في إعدادات Vercel. يرجى إضافته.' };
    }

    // 1. Fetch active niches
    const activeResult = await getActiveNiches();
    if (!activeResult.success) {
      return { success: false, error: 'فشل في الاتصال بقاعدة البيانات لجلب المجالات الحالية.' };
    }

    let activeNiches = activeResult.data || [];
    const deficit = 10 - activeNiches.length;
    
    // 2. If we have 10, return them directly
    if (deficit <= 0) {
      return { success: true, niches: activeNiches.slice(0, 10) };
    }

    // Micro-batch: Request a max of 3 niches to avoid Vercel timeout on free tier (10s limit)
    const batchSize = Math.min(3, deficit);

    // 3. Otherwise, generate the deficit
    const currentMonth = new Date().toLocaleString('ar-EG', { month: 'long' });
    const prompt = `أنت محلل أعمال (Business Analyst) لشركة تقدم نظام CRM ذكي وفوترة. 
نحن في شهر ${currentMonth}.
لدينا حالياً ${activeNiches.length} مجالات نشطة. نريد اقتراح ${batchSize} مجالات تجارية (Niches) جديدة في السعودية يكون الطلب عليها عالياً في هذا الوقت من السنة، والتي تعاني عادة من نقص في التنظيم الرقمي، لتكون أهدافاً لحملاتنا التسويقية بالعمولة.

تأكد ألا تتكرر مع المجالات التالية إن وجدت: ${activeNiches.map(n => n.title).join('، ')}.

لكل مجال، حدد:
1. title: اسم المجال (مثل: شركات التكييف، نقل العفش، عيادات الأسنان)
2. searchQuery: كلمة البحث لاستخدامها في Google Maps (مثل: "شركات تكييف في الرياض")
3. justification: مبرر الطلب الموسمي (سطر واحد)
4. expectedCommission: حجم العمولة المتوقع (مثل: "عالية جداً"، "متوسطة")
5. painPoint: نقطة الألم الحالية للتاجر في هذا المجال (سطر واحد)`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt + " \nأرجع النتيجة بصيغة JSON فقط تحتوي على مصفوفة niches. لا تضف أي نصوص أو شروحات أخرى." }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content || '{}';
      const cleanText = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const object = JSON.parse(cleanText);

    const newNichesRaw = object.niches || [];
    if (newNichesRaw.length > 0) {
      // 4. Save new niches to DB
      const dbResult = await addNiches(newNichesRaw as SuggestedNiche[]);
      if (dbResult.success) {
        const finalResult = await getActiveNiches();
        return { success: true, niches: finalResult.data?.slice(0, 10) || [] };
      } else {
        return { success: false, error: 'Failed to add niches to DB: ' + dbResult.error };
      }
    }

    return { success: true, niches: activeNiches };
  } catch (error: any) {
    console.error("Error analyzing niches:", error);
    return { success: false, error: error.message || String(error) };
  }
}
