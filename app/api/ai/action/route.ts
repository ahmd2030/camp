import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createAiAction } from '@/services/aiActionService'; 

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || body.context || 'حلل هذا الطلب';

    // استخدام النموذج الحديث بدون أي إضافات
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const systemPrompt = `
      أنت وكيل ذكاء اصطناعي إداري. قم بتحليل الطلب التالي ورده بصيغة JSON فقط بهذا الهيكل:
      {
        "type": "string (نوع المهمة)",
        "isSensitive": boolean (true إذا كانت حساسة، false للعادية),
        "aiReasoning": "string (سبب اختيارك)",
        "costEstimate": number (تكلفة تقديرية)
      }
      الطلب: ${prompt}
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    // تنظيف الرد لضمان أنه JSON صالح
    const cleanedJson = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const aiDecision = JSON.parse(cleanedJson);

    // تمرير القرار للخدمة
    await createAiAction({
      type: aiDecision.type,
      isSensitive: aiDecision.isSensitive,
      aiReasoning: aiDecision.aiReasoning,
      costEstimate: aiDecision.costEstimate || 0.1,
      context: body
    });

    return NextResponse.json({ success: true, decision: aiDecision }, { status: 200 });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
