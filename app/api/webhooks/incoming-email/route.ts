import { NextResponse } from 'next/server';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Simple direct Gemini call — no tools, no complexity, just a text reply
async function generateAutoReply(customerEmail: string, messageText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('No Gemini API key found');
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

  const userPrompt = `رسالة من عميل (${customerEmail}):
"""
${messageText}
"""

اكتب رداً احترافياً مباشراً على هذه الرسالة. لا تضع مقدمات أو تعليقات، فقط نص الرد الجاهز للإرسال.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error('Gemini fetch error:', err);
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

    // 2. Generate AI Reply using direct Gemini call (no tools involved)
    const aiReplyText = await generateAutoReply(sender, textBody);

    if (aiReplyText) {
      // 3. Send the reply back to the customer
      await executeEmailAction(
        sender,
        `رد: ${emailData.subject || 'رسالة من فريق Mango AI'}`,
        `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; font-size: 15px;">
          ${aiReplyText.replace(/\n/g, '<br>')}
        </div>`
      );
      
      // Update the inbox doc with the AI response
      if (inboxDocRef) {
        try {
          await updateDoc(inboxDocRef, {
            finalResponse: aiReplyText,
            status: 'COMPLETED'
          });
        } catch (e) {
          console.error('Failed to update inbox doc with response', e);
        }
      }

      return NextResponse.json({ success: true, message: 'Auto-reply sent successfully' });
    } else {
      // Update inbox doc to show AI failed
      if (inboxDocRef) {
        try {
          await updateDoc(inboxDocRef, { status: 'AI_FAILED' });
        } catch (e) {}
      }
      return NextResponse.json({ success: false, error: 'Gemini AI failed to generate reply' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
