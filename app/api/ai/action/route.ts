import { NextResponse } from 'next/server';
import { createAiAction } from '@/services/aiActionService';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, contextData } = body;

    // 1. التحقق من مفتاح الـ API وتكوين المزود صراحة
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key is missing! Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.");
    }

    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    // --- الربط الحقيقي بنموذج Google Gemini ---
    const { object } = await generateObject({
      // استخدام نموذج gemini-1.5-flash
      model: google('gemini-1.5-flash'),
      schema: z.object({
        type: z.string().describe('نوع المهمة المستنتجة باللغة الإنجليزية، مثلاً: generate_invoice, send_email, update_client'),
        isSensitive: z.boolean().describe('true إذا كانت المهمة تتعلق بالأموال، الفواتير، التعديل أو التواصل الخارجي. false للبحث فقط.'),
        costEstimate: z.number().describe('تكلفة تقديرية للعملية بالدولار، رقم عشري صغير مثل 0.05 أو 0.10.'),
        aiReasoning: z.string().describe('نص باللغة العربية يشرح بدقة للمدير لماذا تم اختيار هذا الإجراء.'),
      }),
      prompt: `أنت وكيل إداري ذكي لنظام إدارة شركات (CRM).
مهمتك تحليل طلب المدير وتحديد الإجراء الإداري المناسب لتنفيذه آلياً.
طلب المدير: "${prompt}"
${contextData ? `بيانات السياق الحالية: ${JSON.stringify(contextData)}` : ''}
`,
    });

    const aiResponse = object;
    // -------------------------------------------------------------

    // تمرير قرار الذكاء الاصطناعي لخدمة المهام للتحقق من الميزانية وحفظها
    const actionResult = await createAiAction({
      type: aiResponse.type,
      isSensitive: aiResponse.isSensitive,
      costEstimate: aiResponse.costEstimate,
      aiReasoning: aiResponse.aiReasoning,
      context: contextData || { originalPrompt: prompt }
    });

    if (!actionResult.success) {
      return NextResponse.json({ success: false, error: actionResult.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: actionResult }, { status: 200 });

  } catch (error: any) {
    // 2. معالجة الأخطاء وطباعتها بالتفصيل في السجلات
    console.error("API Error Details:", error);
    
    // 3. إرجاع رسالة الخطأ الفعلية للواجهة الأمامية لتسهيل التتبع
    return NextResponse.json({ 
      success: false, 
      error: error.message || "حدث خطأ غير معروف في الخادم",
      details: error.toString()
    }, { status: 500 });
  }
}
