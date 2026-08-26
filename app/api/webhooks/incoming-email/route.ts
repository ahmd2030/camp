import { NextResponse } from 'next/server';
import { chatWithTeamMember } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

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
          actualText = fetchedEmail.data.text || '';
          actualHtml = fetchedEmail.data.html || '';
        }
      } catch (err) {
        console.error('Failed to fetch full email body from Resend API:', err);
      }
    }

    let textBody = actualText || actualHtml || emailData.subject || 'Empty message';

    // Clean up Gmail quoted replies
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

    // 2. Generate AI Reply
    const prompt = `استلمنا رسالة من عميل بريده الإلكتروني: ${sender}.
نص الرسالة (قم بتجاهل أي تاريخ مراسلات سابق يظهر في أسفل النص، وركز فقط على السؤال الأخير):
"""
${textBody}
"""

مهمتك: الرد نيابة عن مدير التسويق الذكي من شركة Mango AI بلباقة واحترافية. 
ركز على الإجابة على سؤاله الأخير فقط، وإذا سأل عن الأسعار فقدم نطاقاً سعرياً منطقياً لشركات التسويق مع التركيز بقوة على العائد على الاستثمار.`;

    const aiResponse = await chatWithTeamMember('cmo', prompt, []);

    if (aiResponse && aiResponse.success && aiResponse.response) {
      // 3. Send the reply back to the customer
      await executeEmailAction(
        sender,
        `رد: ${emailData.subject || 'رسالة ذكية من Mango AI'}`,
        `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
          ${aiResponse.response.replace(/\n/g, '<br>')}
        </div>`
      );
      
      // Update the inbox doc with the AI response
      if (inboxDocRef) {
        try {
          await updateDoc(inboxDocRef, {
            finalResponse: aiResponse.response,
            status: 'COMPLETED'
          });
        } catch (e) {
          console.error('Failed to update inbox doc with response', e);
        }
      }

      return NextResponse.json({ success: true, message: 'Auto-reply sent successfully and DB updated' });
    } else {
      return NextResponse.json({ success: false, error: 'AI failed to generate reply' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
