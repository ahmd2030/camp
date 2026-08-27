import { NextResponse } from 'next/server';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Simple direct OpenRouter call — no tools, always returns plain text reply
async function generateAutoReply(customerEmail: string, messageText: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('No OPENROUTER_API_KEY found in environment');
    return null;
  }

  const systemPrompt = `أنت مدير التسويق الاحترافي في شركة Mango AI. شركتنا متخصصة في أنظمة CRM وأتمتة التسويق بالذكاء الاصطناعي.

تعليمات هامة جداً:
1. اقرأ رسالة العميل بدقة وأجب على سؤاله الأخير فقط بشكل مباشر.
2. إذا سأل عن السعر: قدم نطاقاً بين 1000$ و5000$ حسب التعقيد، وركز على العائد على الاستثمار (ROI)، ثم ادعه لاجتماع.
3. إذا طلب خدمة خارج نطاقنا: لا ترفض، بل رشح له أدوات عالمية موثوقة واعرض التكامل معها.
4. اختم دائماً بـ: "مع التحية، فريق Mango AI"
5. ممنوع استخدام عبارة "رسالة تسويقية ذكية".
6. الرد يجب أن يكون مختصراً ومهنياً وباللغة العربية الفصحى.`;

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
          { role: 'user', content: `رسالة من عميل (${customerEmail}):\n"""\n${messageText}\n"""\n\nاكتب رداً احترافياً مباشراً. لا تضع مقدمات أو تعليقات، فقط نص الرد الجاهز للإرسال.` }
        ]
        // NO tools here — we need a plain text response always
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text || null;
  } catch (err) {
    console.error('OpenRouter fetch error:', err);
    return null;
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

    // 2. Generate AI Draft using OpenRouter (no tools = always plain text)
    const aiDraftText = await generateAutoReply(sender, textBody);

    // 3. Update inbox doc with draft — owner reviews and approves before sending
    if (inboxDocRef) {
      try {
        await updateDoc(inboxDocRef, {
          aiDraft: aiDraftText || null,
          status: aiDraftText ? 'DRAFT' : 'AI_FAILED',
          subject: emailData.subject || null
        });
      } catch (e) {
        console.error('Failed to update inbox doc with draft', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: aiDraftText
        ? 'Draft saved — awaiting owner approval to send'
        : 'AI failed to generate draft'
    });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
