import { NextResponse } from 'next/server';
import { createAiAction } from '@/services/aiActionService';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, contextData } = body;

    // --- الربط الحقيقي بنموذج Google Gemini ---
    const { object } = await generateObject({
      model: google('models/gemini-1.5-flash-latest'),
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

  } catch (error) {
    console.error("Error in AI action route:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ داخلي في الخادم أثناء الاتصال بالذكاء الاصطناعي." }, { status: 500 });
  }
}
