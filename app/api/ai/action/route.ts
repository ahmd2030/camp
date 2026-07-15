import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createAiAction } from '@/services/aiActionService'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || body.context || 'حلل هذا الطلب';
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // استخدام النموذج المعتمد
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `
      أنت وكيل ذكاء اصطناعي إداري. قم بتحليل الطلب التالي ورده بصيغة JSON فقط بهذا الهيكل:
      {
        "type": "string",
        "isSensitive": boolean,
        "aiReasoning": "string",
        "costEstimate": number
      }
      الطلب: ${prompt}
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    const cleanedJson = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const aiDecision = JSON.parse(cleanedJson);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
