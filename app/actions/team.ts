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
  'cro': 'خبير المبيعات (CRO)',
  'coo': 'مدير النظام (COO/CTO)'
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

    let systemPrompt = `أنت ${roleTitle} في شركة Mango AI (نظام CRM ذكي وتسويق استراتيجي).\n\n${PUSHBACK_RULE}\n\nتحدث دائماً بمهنية، بضمير المتكلم نيابة عن قسمك، وباللغة العربية الفصحى الواضحة والراقية (Premium Business Tone). لا تذكر أنك ذكاء اصطناعي، أنت إنسان خبير يترأس هذا القسم.`;
    
    if (roleId === 'coo') {
      systemPrompt = `أنت مدير النظام والعمليات التقنية في شركة Mango AI. هدفك حماية موارد الخوادم وتقليل التكاليف التقنية. ارفض أي فكرة إدارية تستهلك موارد السيرفر بلا فائدة أو تهدد استقرار النظام، ولا تجامل المدير أبداً.\n\nتحدث بمهنية، بضمير المتكلم نيابة عن القسم التقني، وباللغة العربية الفصحى الواضحة.`;
    }

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

export async function getBoardMemberOpinion(roleId: string, topic: string) {
  try {
    const roleTitle = ROLES[roleId] || 'مستشار خبير';
    
    let systemPrompt = `أنت ${roleTitle} في شركة Mango AI (نظام CRM ذكي وتسويق استراتيجي).\n\n${PUSHBACK_RULE}\n\nتحدث دائماً بمهنية، بضمير المتكلم نيابة عن قسمك، وباللغة العربية الفصحى الواضحة والراقية (Premium Business Tone). لا تذكر أنك ذكاء اصطناعي، أنت إنسان خبير يترأس هذا القسم. نحن الآن في اجتماع مجلس إدارة.`;
    
    if (roleId === 'coo') {
      systemPrompt = `أنت مدير النظام والعمليات التقنية في شركة Mango AI. هدفك حماية موارد الخوادم وتقليل التكاليف التقنية. ارفض أي فكرة إدارية تستهلك موارد السيرفر بلا فائدة أو تهدد استقرار النظام، ولا تجامل المدير أبداً.\n\nتحدث بمهنية، بضمير المتكلم نيابة عن القسم التقني، وباللغة العربية الفصحى الواضحة. نحن الآن في اجتماع مجلس إدارة.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `موضوع اجتماع مجلس الإدارة المطروح للنقاش:\n\n${topic}\n\nما هو رأيك المهني الصريح من وجهة نظر تخصصك؟` }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponseText = data.choices?.[0]?.message?.content || 'عذراً، لا يمكنني الإجابة الآن.';

    return { success: true, response: aiResponseText };
  } catch (error: any) {
    console.error("Board Member Error:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء التواصل مع الموظف" };
  }
}

export async function saveBoardMeeting(topic: string, responses: Record<string, string>) {
  try {
    await addDoc(collection(db, 'board_meetings'), {
      topic,
      responses,
      timestamp: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Save Board Meeting Error:", error);
    return { success: false, error: error.message };
  }
}
