import { NextResponse } from 'next/server';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Fetch all company knowledge from Firestore
async function getCompanyKnowledge(): Promise<string> {
  try {
    const snap = await getDocs(collection(db, 'company_knowledge'));
    if (snap.empty) return '';
    const entries: string[] = [];
    snap.forEach(doc => {
      const d = doc.data();
      entries.push(`س: ${d.question}\nج: ${d.answer}`);
    });
    return entries.join('\n\n---\n\n');
  } catch (e) {
    console.error('Failed to fetch company knowledge:', e);
    return '';
  }
}

// Generate AI reply using company knowledge + OpenRouter
async function generateAutoReply(customerEmail: string, messageText: string): Promise<{ text: string | null; suggestedTime: string | null; hasKnowledge: boolean }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('No OPENROUTER_API_KEY found in environment');
    return { text: null, suggestedTime: null, hasKnowledge: false };
  }

  const knowledgeBase = await getCompanyKnowledge();
  const hasKnowledge = knowledgeBase.length > 50;

  let systemPrompt = `أنت مدير التسويق الاحترافي في شركة Mango AI.

تعليمات صارمة:
1. أجب فقط بناءً على المعلومات الموجودة أدناه في [قاعدة معرفة الشركة]. لا تخترع معلومات غير موجودة.
2. إذا سأل العميل سؤالاً لا تجد إجابته في قاعدة المعرفة، اكتب في الرد: "أحتاج التحقق من هذه المعلومة مع الإدارة وسأعود إليك قريباً."
3. الرد مختصر، مهني، وباللغة العربية الفصحى، واختم بـ "فريق Mango AI".
4. ادرس رسالة العميل (ودومين الإيميل إن وجد)، وخمن دولته ودوامه الرسمي.
5. يجب أن ترجع النتيجة بصيغة JSON فقط بهذا الشكل:
{
  "replyText": "نص الرد الجاهز للإرسال للعميل",
  "suggestedTime": "نصيحة قصيرة جداً لمديرك عن أفضل وقت لإرسال هذا الرد (مثال: 💡 يبدو أن العميل من السعودية، أفضل وقت للإرسال غداً 10 صباحاً)"
}`;

  if (hasKnowledge) {
    systemPrompt += `\n\n[قاعدة معرفة الشركة]:\n${knowledgeBase}`;
  } else {
    systemPrompt += '\n\n[تنبيه]: لا توجد معلومات في قاعدة المعرفة بعد. أجب بشكل عام واطلب من العميل الانتظار.';
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mangosai.co',
        'X-Title': 'Mango AI'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `رسالة من عميل (${customerEmail}):\n"""\n${messageText}\n"""` }
        ]
      })
    });

    if (!response.ok) {
      return { text: null, suggestedTime: null, hasKnowledge };
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    try {
      const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      return { 
        text: parsed.replyText || null, 
        suggestedTime: parsed.suggestedTime || null,
        hasKnowledge 
      };
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', parseErr, rawContent);
      return { text: rawContent, suggestedTime: null, hasKnowledge };
    }
  } catch (err) {
    return { text: null, suggestedTime: null, hasKnowledge };
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Resend webhook payload
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true, message: 'Ignored non-received event' });
    }
    
    const emailData = payload.data || payload; 
    let sender = emailData.from;
    
    // Extract raw email if it comes in "Name <email>" format
    if (sender && sender.includes('<')) {
      const match = sender.match(/<([^>]+)>/);
      if (match) sender = match[1];
    }
    sender = sender?.toLowerCase().trim();

    let actualText = emailData.text || '';
    let actualHtml = emailData.html || '';

    // If Resend didn't include the body in the webhook payload, fetch it using the email_id
    if (!actualText && !actualHtml && emailData.email_id) {
      try {
        const fetchedEmail = await resend.emails.get(emailData.email_id);
        if (fetchedEmail && fetchedEmail.data) {
          actualText = (fetchedEmail.data as any).text || '';
          actualHtml = (fetchedEmail.data as any).html || '';
        }
      } catch (err) {
        console.error('Failed to fetch full email body from Resend API:', err);
      }
    }

    let textBody = actualText || actualHtml || emailData.subject || 'Empty message';

    // Clean up Gmail quoted replies (cut off the "On ... wrote:" part)
    if (actualText && actualText.includes('On ') && actualText.includes('wrote:')) {
      const replyParts = actualText.split(/On .* wrote:/);
      if (replyParts.length > 0 && replyParts[0].trim().length > 0) {
        textBody = replyParts[0].trim();
      }
    }

    // DEBUG: Save raw payload to Firestore
    try {
      await addDoc(collection(db, 'webhook_logs'), {
        createdAt: new Date(),
        payload: payload,
        extractedTextBody: textBody,
        sender: sender
      });
    } catch (e) {
      console.error('Failed to log webhook', e);
    }

    if (!sender || !textBody) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Mark lead as replied in Firestore to stop drip campaigns
    try {
      const q = query(collection(db, 'sent_leads'), where('email', '==', sender));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          hasReplied: true,
          lastReplyAt: new Date()
        });
      });
    } catch (dbError) {
      console.error('Error updating Firestore for reply:', dbError);
    }

    // 1.5 Save incoming message to Inbox (contact_messages)
    let inboxDocRef: any = null;
    try {
      inboxDocRef = await addDoc(collection(db, 'contact_messages'), {
        email: sender,
        customerName: emailData.from || sender,
        message: textBody,
        status: 'NEW',
        source: 'email_reply',
        createdAt: new Date()
      });
    } catch (inboxError) {
      console.error('Error saving to inbox:', inboxError);
    }

    // 2. Generate AI reply using company knowledge
    const aiResult = await generateAutoReply(sender, textBody);

    // Save as draft for owner review with time recommendation
    if (inboxDocRef) {
      try {
        await updateDoc(inboxDocRef, {
          aiDraft: aiResult.text || null,
          suggestedTime: aiResult.suggestedTime || null,
          status: aiResult.text ? 'DRAFT' : 'AI_FAILED',
          subject: emailData.subject || null,
          hasKnowledge: aiResult.hasKnowledge
        });
      } catch (e) {
        console.error('Failed to update inbox doc with draft', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Draft saved with time recommendation',
      hasKnowledge: aiResult.hasKnowledge
    });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
