"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export interface NicheSuggestion {
  title: string;
  searchQuery: string; // The query to send to Google Places API
  justification: string;
  expectedCommission: string;
  painPoint: string;
}

export async function analyzeNiches(): Promise<{ success: boolean; niches?: NicheSuggestion[]; error?: string }> {
  try {
    const currentMonth = new Date().toLocaleString('ar-EG', { month: 'long' });
    const prompt = `أنت محلل أعمال (Business Analyst) لشركة تقدم نظام CRM ذكي وفوترة. 
نحن في شهر ${currentMonth}.
اقترح 3 مجالات تجارية (Niches) في السعودية يكون الطلب عليها عالياً في هذا الوقت من السنة، والتي تعاني عادة من نقص في التنظيم الرقمي، لتكون أهدافاً لحملاتنا التسويقية بالعمولة.

لكل مجال، حدد:
1. title: اسم المجال (مثل: شركات التكييف، نقل العفش، عيادات الأسنان)
2. searchQuery: كلمة البحث لاستخدامها في Google Maps (مثل: "شركات تكييف في الرياض")
3. justification: مبرر الطلب الموسمي (سطر واحد)
4. expectedCommission: حجم العمولة المتوقع (مثل: "عالية جداً"، "متوسطة")
5. painPoint: نقطة الألم الحالية للتاجر في هذا المجال (سطر واحد)`;

    const { object } = await generateObject({
      model: google('gemini-1.5-pro'),
      schema: z.object({
        niches: z.array(z.object({
          title: z.string(),
          searchQuery: z.string(),
          justification: z.string(),
          expectedCommission: z.string(),
          painPoint: z.string(),
        }))
      }),
      prompt: prompt,
    });

    return { success: true, niches: object.niches };
  } catch (error: any) {
    console.error("Error analyzing niches:", error);
    return { success: false, error: "فشل في تحليل المجالات. يرجى المحاولة مرة أخرى." };
  }
}
