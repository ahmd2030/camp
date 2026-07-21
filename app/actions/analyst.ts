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

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
    
    let object;
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt + " \nأرجع النتيجة بصيغة JSON تحتوي على مصفوفة niches." }] }]
      });
      object = JSON.parse(result.response.text());
    } catch (flashError: any) {
      console.warn("Flash failed, trying Pro:", flashError.message);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt + " \nأرجع النتيجة بصيغة JSON تحتوي على مصفوفة niches." }] }]
      });
      object = JSON.parse(result.response.text());
    }

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
