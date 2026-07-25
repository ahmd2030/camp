"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { sendTestEmail } from '@/app/actions/sendEmail';
import { markSmartStop } from '@/app/actions/campaigns';

interface InquiryResponseResult {
  success: boolean;
  finalMessage?: string;
  error?: string;
}

/**
 * 1. The Generator (Marketer)
 */
async function generateDraft(inquiryText: string, clientName: string, feedback?: string): Promise<string> {
  let prompt = `أنت موظف مبيعات وتطوير أعمال خبير في شركة Mango AI.
مهمتك الرد على استفسار العميل التالي: "${inquiryText}"

القواعد الصارمة:
1. الرد يجب أن يكون دافئاً، احترافياً، وغير روبوتي إطلاقاً.
2. يجب إدراج هذه المبادرة الاستراتيجية حرفياً أو بأسلوب مشابه ومحترف جداً: "نحن في الشركة نقوم بربط المنشآت والعملاء بخدمات متقدمة تساعدهم على النمو كمبادرة تهدف لدعم قطاع الأعمال، وخدماتنا في توسع كبير ومستمر لتلبية احتياجاتكم".
3. يجب دعوة العميل لاجتماع عبر هذا الرابط: https://mango-ai.com/book
4. خاطب العميل باسمه (${clientName}) ووقع باسم "إدارة تطوير الأعمال | Mango AI".`;

  if (feedback) {
    prompt += `\n\nتنبيه عاجل من المدقق: المحاولة السابقة تم رفضها للأسباب التالية: ${feedback}\nالرجاء إعادة صياغة الرد وتصحيح هذه الأخطاء فوراً.`;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Error (Generator): ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 2. The Auditor (QA Agent)
 */
async function auditDraft(draft: string): Promise<{ passed: boolean; feedback: string }> {
  const prompt = `أنت مدقق جودة (Auditor) صارم في شركة Mango AI. 
مهمتك هي فحص هذا الرد المصاغ للعميل:
"""
${draft}
"""

معايير الفحص:
1. الخلو من الأخطاء الإملائية أو اللغوية.
2. اللهجة يجب أن تكون احترافية، دافئة، وغير روبوتية أو مصطنعة.
3. يجب أن تحتوي الرسالة على فقرة توضح "مبادرة دعم ونمو قطاع الأعمال وتوسع الخدمات".
4. يجب أن يتواجد رابط الحجز بوضوح تام (https://mango-ai.com/book).

اكتب ردك بصيغة JSON فقط:
{
  "passed": boolean, // true إذا كان مثالياً 100%، false إذا كان هناك أي خلل
  "feedback": string // اتركها فارغة إذا كان passed=true، أو اكتب ملاحظات التصحيح إذا كان passed=false
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
    throw new Error(`OpenRouter Error (Auditor): ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    return {
      passed: parsed.passed === true,
      feedback: parsed.feedback || ''
    };
  } catch (e) {
    console.error("Auditor parsing error", e);
    return { passed: false, feedback: "فشل المدقق في معالجة المخرجات" };
  }
}

/**
 * Autonomous Pipeline
 */
export async function processInquiryAutonomous(inquiryId: string, clientName: string, inquiryText: string, clientEmail: string): Promise<InquiryResponseResult> {
  try {
    // 1. First Draft
    let draft = await generateDraft(inquiryText, clientName);
    
    // 2. First Audit
    const audit1 = await auditDraft(draft);

    if (!audit1.passed) {
      console.log(`Auditor rejected first draft. Feedback: ${audit1.feedback}`);
      // 3. Second Draft (Correction)
      draft = await generateDraft(inquiryText, clientName, audit1.feedback);
      
    }

    // 4. Send the Email
    const emailResult = await sendTestEmail(draft);

    if (!emailResult.success) {
      await updateDoc(doc(db, 'inquiries', inquiryId), { status: 'error_email' });
      return { success: false, error: 'فشل إرسال البريد الإلكتروني للعميل' };
    }

    // 6. Smart Stop: mark as replied
    await markSmartStop(clientEmail, 'reply');

    // 7. Update status to processed
    const inquiryRef = doc(db, 'inquiries', inquiryId);
    await updateDoc(inquiryRef, {
      status: 'processed',
      aiResponse: draft,
      respondedAt: new Date().toISOString()
    });

    return { success: true, finalMessage: draft };

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return { success: false, error: 'حدث خطأ في النظام المستقل لمعالجة الاستفسارات.' };
  }
}
