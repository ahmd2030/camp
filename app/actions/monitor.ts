"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logSmartError(errorDetails: string) {
  try {
    // 1. إرسال الخطأ إلى OpenRouter لتحليله
    const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // يمكنك تغييره للنموذج المفضل لديك
        messages: [
          {
            role: 'system',
            content: `أنت مدير تقني. النظام واجه هذا الخطأ التقني: [${errorDetails}]. 
اشرح للمدير العام المشكلة في جملة واحدة بسيطة، واقترح عليه خطوة واحدة للحل.
يجب أن يكون الرد باللغة العربية.`
          }
        ]
      })
    });

    if (!openrouterRes.ok) {
      console.error('Failed to connect to OpenRouter for error analysis');
      return false;
    }

    const aiData = await openrouterRes.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || 'تعذر توليد رسالة الذكاء الاصطناعي';

    // 2. حفظ الخطأ والرد الذكي في Firestore
    await addDoc(collection(db, 'system_alerts'), {
      technicalError: errorDetails,
      aiMessage: aiMessage,
      status: 'UNREAD',
      timestamp: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error in logSmartError:', error);
    return false;
  }
}
