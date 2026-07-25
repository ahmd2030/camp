"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ROLES: Record<string, string> = {
  'cmo': 'مدير التسويق (CMO)',
  'cfo': 'المحلل المالي (CFO)',
  'cso': 'المستشار الاستراتيجي (CSO)',
  'cro': 'خبير المبيعات (CRO)'
};

const PUSHBACK_RULE = `القاعدة الذهبية الصارمة: أنت موظف خبير في مجالك. هدفك الأوحد هو مصلحة الشركة وزيادة أرباحها وكفاءتها. يُمنع منعاً باتاً مجاملة المدير أو الموافقة على قراراته لمجرد إرضائه أو لتجنب الصدام. إذا اقترح المدير فكرة خاطئة، غير مجدية مالياً، أو تضر بالعمل، يجب عليك معارضته بأدب واحترافية وتقديم الحجج، البيانات، والحلول البديلة التي تخدم مصلحة الشركة فقط. لا تستخدم عبارات متملقة مثل "فكرة رائعة يا سيدي" إذا كانت الفكرة سيئة. كن حاسماً، منطقياً، ومباشراً.`;

export async function chatWithTeamMember(roleId: string, message: string, history: ChatMessage[] = []) {
  try {
    const roleTitle = ROLES[roleId] || 'مستشار خبير';
    
    // Save user message to Firestore
    await addDoc(collection(db, 'team_chats'), {
      roleId,
      role: 'user',
      content: message,
      timestamp: serverTimestamp()
    });

    const systemPrompt = `أنت ${roleTitle} في شركة Mango AI (نظام CRM ذكي وتسويق استراتيجي).\n\n${PUSHBACK_RULE}\n\nتحدث دائماً بمهنية، بضمير المتكلم نيابة عن قسمك، وباللغة العربية الفصحى الواضحة والراقية (Premium Business Tone). لا تذكر أنك ذكاء اصطناعي، أنت إنسان خبير يترأس هذا القسم.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet", // Stronger model for deep logic
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponseText = data.choices?.[0]?.message?.content || 'عذراً، لا يمكنني الإجابة الآن.';

    // Save AI response to Firestore
    await addDoc(collection(db, 'team_chats'), {
      roleId,
      role: 'assistant',
      content: aiResponseText,
      timestamp: serverTimestamp()
    });

    return { success: true, response: aiResponseText };

  } catch (error: any) {
    console.error("Team Chat Error:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء التواصل مع الموظف" };
  }
}
