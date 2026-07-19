import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createAiAction } from '@/services/aiActionService'; 
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function openRouterCall(model: string, systemPrompt: string, userPrompt: string, apiKey: string) {
  // FORCE OVERRIDE: Bypass the orchestrator's choice entirely to prevent 404 dot errors
  let finalModel = "openai/gpt-4o";
  // Preserve QA middleware and Orchestrator classification models
  if (model === "google/gemini-1.5-pro" || model === "openai/gpt-4o-mini") {
    finalModel = model;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: finalModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function evaluateAIOutput(text: string, apiKey: string) {
  const qaSystemPrompt = `
    أنت مدير جودة صارم (QA Manager) في وكالة رقمية. مهمتك مراجعة النص التالي. يجب عليك رفض النص إذا كان يحتوي على:
    1) وعود مالية أو أرقام مبيعات مضمونة.
    2) أسعار غير متوافقة مع الكتالوج.
    3) هلوسة أو معلومات غير منطقية.
    قم بالرد فقط بصيغة JSON كالتالي:
    {"approved": true/false, "feedback": "سبب الرفض إن وجد أو رسالة نجاح"}
  `;
  try {
    const result = await openRouterCall("google/gemini-1.5-pro", qaSystemPrompt, text, apiKey);
    const parsed = JSON.parse(result.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
    return parsed;
  } catch (e) {
    return { approved: false, feedback: "فشل مدير الجودة الآلي في تحليل النص." };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || body.context || 'حلل هذا الطلب';
    const clientId = body.clientId;
    const clientName = body.clientName;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is missing' }, { status: 500 });
    }

    // جلب الخدمات النشطة لحقنها في وعي الذكاء الاصطناعي
    let servicesText = "لا توجد خدمات محددة حالياً.";
    try {
      const q = query(collection(db, 'services'), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      const activeServices: any[] = [];
      querySnapshot.forEach((doc) => {
        activeServices.push(doc.data());
      });
      if (activeServices.length > 0) {
        servicesText = activeServices.map(s => `- ${s.name}: ${s.description || 'بدون وصف'} (السعر: ${s.price} ريال)`).join('\n');
      }
    } catch (e) {
      console.warn("Failed to fetch services for AI context", e);
    }

    // الخطوة الأولى: الموزع (Orchestrator) لتحديد نوع المهمة
    const orchestratorPrompt = `
      أنت الموزع الذكي (Orchestrator). قم بتحليل الطلب التالي وحدد فئته الرئيسية.
      يجب أن يكون الرد بصيغة JSON يحتوي على مفتاح "category" وقيمته إما:
      "financial": إذا كان الطلب يتعلق بالفواتير، الأموال، الدفع، الحسابات، أو التحليل المالي.
      "marketing": إذا كان الطلب يتعلق بكتابة المحتوى، التسويق، الإعلانات، أو النشر. يجب عليك استخدام نموذج openai/gpt-4o حصراً لتنفيذ مهام الكتابة أو التسويق، ولا تستخدم claude أبداً.
      "general": لأي مهام إدارية أخرى.
      أمثلة: 
      - أنشئ فاتورة -> {"category": "financial"}
      - اكتب تغريدة للتسويق -> {"category": "marketing"}
    `;

    // استخدام نموذج سريع ورخيص للتصنيف
    const categoryResultStr = await openRouterCall("openai/gpt-4o-mini", orchestratorPrompt, prompt, openRouterKey);
    let category = "general";
    try {
      const parsedCat = JSON.parse(categoryResultStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
      if (parsedCat.category) category = parsedCat.category.toLowerCase();
    } catch (e) {
      console.warn("Could not parse category JSON, defaulting to general");
    }

    // الخطوة الثانية: توجيه المهمة للنموذج المتخصص
    let targetModel = "google/gemini-1.5-pro"; // default
    if (category.includes("financial")) {
      targetModel = "openai/gpt-4o";
    } else if (category.includes("marketing")) {
      targetModel = "openai/gpt-4o";
    }

    console.log(`[Orchestrator] Request categorized as: ${category}. Routing to: ${targetModel}`);

    const specializedSystemPrompt = `
      أنت موظف ذكاء اصطناعي في شركتنا (${category}). هذا هو الكتالوج الرسمي لخدماتنا وأسعارها:
      [${servicesText}]
      يجب عليك استخدام هذه الخدمات والأسعار الحقيقية فقط عند إنشاء خطط تسويقية أو فواتير للعملاء، ويُمنع منعاً باتاً اختراع أسعار من خيالك.

      قم بتحليل الطلب ورده بصيغة JSON فقط بهذا الهيكل الدقيق:
      {
        "type": "string",
        "isSensitive": boolean,
        "aiReasoning": "string",
        "costEstimate": number,
        "requires_payment": boolean
      }
      isSensitive: true للعمليات المالية والفواتير والمهام الهامة.
      aiReasoning: شرح المهمة أو الخطوات.
      costEstimate: تكلفة معالجة الذكاء الاصطناعي بالدولار (مثلا 0.1).
      requires_payment: true إذا كانت المهمة تتطلب دفع مبلغ مالي لجهة خارجية (مثل مورد أو إعلان).
    `;

    const resultText = await openRouterCall(targetModel, specializedSystemPrompt, prompt, openRouterKey);
    
    if (!resultText) {
      throw new Error("لم يتم استلام أي رد من النموذج (فارغ أو خطأ 404).");
    }

    const cleanedJson = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const aiDecision = JSON.parse(cleanedJson);

    // تقييم مدير الجودة الآلي
    const qaResult = await evaluateAIOutput(cleanedJson, openRouterKey);
    let qaWarning = null;
    if (qaResult && !qaResult.approved) {
      qaWarning = qaResult.feedback || "مرفوض من مدير الجودة الآلي";
    }

    // حفظ المهمة في قاعدة البيانات
    const actionResult = await createAiAction({
      type: aiDecision.type,
      isSensitive: aiDecision.isSensitive,
      aiReasoning: aiDecision.aiReasoning,
      costEstimate: aiDecision.costEstimate || 0.1,
      requires_payment: aiDecision.requires_payment || false,
      clientId: clientId || null,
      clientName: clientName || null,
      qaWarning: qaWarning,
      context: { ...body, routedModel: targetModel, category }
    });

    if (!actionResult.success) {
      throw new Error(actionResult.message || 'فشل حفظ المهمة في قاعدة البيانات');
    }

    console.log("AI Decision:", aiDecision);
    return NextResponse.json({ success: true, decision: aiDecision, actionId: actionResult.id }, { status: 200 });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
