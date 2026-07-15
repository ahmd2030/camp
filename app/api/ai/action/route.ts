import { NextResponse } from 'next/server';
import { createAiAction } from '@/services/aiActionService'; // تأكد من المسار

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || body.context || 'حلل هذا الطلب';
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 500 });
    }

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

    // الاتصال المباشر بخوادم جوجل (بدون SDK)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const cleanedJson = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const aiDecision = JSON.parse(cleanedJson);

    // تمرير القرار للخدمة لخصم الميزانية وإنشاء المهمة
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
