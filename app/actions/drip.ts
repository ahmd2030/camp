"use server";

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { sendTestEmail } from './sendEmail';

export async function getPendingFollowUps() {
  try {
    const leadsRef = collection(db, 'sent_leads');
    // Firestore requires composite index for multiple fields. We'll do a simple query and filter in memory for MVP.
    // Querying active leads that haven't replied or booked.
    const q = query(
      leadsRef,
      where('hasReplied', '==', false),
      where('hasBooked', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    
    const pending: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const stage = data.followUpStage || 0;
      const lastContact = data.lastContactedAt || 0;
      
      if (stage < 3 && (now - lastContact) >= THREE_DAYS) {
        pending.push({ id: doc.id, ...data });
      }
    });

    return { success: true, count: pending.length, leads: pending };
  } catch (error: any) {
    console.error("Error fetching pending follow-ups:", error);
    return { success: false, error: error.message };
  }
}

export async function executeDripLead(lead: any) {
  try {
    const stage = (lead.followUpStage || 0) + 1;
    
    // 1. AI Angle Shifting
    const prompt = `أنت موظف مبيعات وتطوير أعمال خبير في شركة Mango AI.
هذا العميل (${lead.businessName}) تم إرسال الرسالة التالية له مسبقاً:
"""
${lead.lastMessage}
"""
العميل لم يرد منذ 3 أيام. هذه هي المتابعة رقم ${stage}.

القواعد الصارمة:
1. قم بتغيير زاوية التسويق (Angle Shifting): إذا ركزت الرسالة السابقة على شيء، ركز الآن على شيء آخر (مثلاً: دراسة حالة مختصرة، أو طلب مكالمة سريعة لمدة 5 دقائق لتقييم الوضع).
2. اجعل الرسالة قصيرة جداً وودودة.
3. التخفي البشري 100%: لا تستخدم أي مصطلحات روبوتية.
4. يجب إبقاء التركيز على أننا شركة B2B، وأن تذكر رابط الحجز بوضوح: https://mango-ai.com/book
5. يجب أن تذكر المبادرة بشكل طبيعي: "نحن في الشركة نقوم بربط المنشآت والعملاء بخدمات متقدمة تساعدهم على النمو كمبادرة تهدف لدعم قطاع الأعمال، وخدماتنا في توسع كبير ومستمر لتلبية احتياجاتكم".

اكتب الرسالة بالكامل لتكون جاهزة للإرسال مباشرة للعميل. لا تضف أي تعليقات خارجية.`;

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
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const nextMessage = data.choices?.[0]?.message?.content || '';

    if (!nextMessage) throw new Error("لم يتم توليد الرسالة بشكل صحيح.");

    // 2. Send Email
    const emailResult = await sendTestEmail(nextMessage);
    if (!emailResult.success) {
      throw new Error("فشل إرسال البريد الإلكتروني للمتابعة.");
    }

    // 3. Update Firestore
    const leadRef = doc(db, 'sent_leads', lead.id);
    await updateDoc(leadRef, {
      followUpStage: stage,
      lastContactedAt: Date.now(),
      lastMessage: nextMessage
    });

    return { success: true, message: 'تم إرسال المتابعة بنجاح' };

  } catch (error: any) {
    console.error(`Error executing drip for ${lead.id}:`, error);
    return { success: false, message: error.message };
  }
}
