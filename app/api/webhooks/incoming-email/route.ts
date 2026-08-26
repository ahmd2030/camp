import { NextResponse } from 'next/server';
import { chatWithTeamMember } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Resend webhook payload
    const emailData = payload.data || payload; 
    let sender = emailData.from;
    
    // Extract raw email if it comes in "Name <email>" format
    if (sender && sender.includes('<')) {
      const match = sender.match(/<([^>]+)>/);
      if (match) sender = match[1];
    }
    sender = sender?.toLowerCase().trim();

    const textBody = emailData.text || emailData.html || '';

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
نص الرسالة:
"""
${textBody}
"""

مهمتك: صياغة رد احترافي ومناسب على استفسار هذا العميل. 
اكتب نص الرسالة فقط بدون أي مقدمات لك، لأن نصك سيتم إرساله مباشرة كبريد إلكتروني للعميل.`;

    const aiResponse = await chatWithTeamMember('cmo', prompt, []);

    if (aiResponse && aiResponse.success && aiResponse.response) {
      // 3. Send the reply back to the customer
      await executeEmailAction(
        sender,
        `رد: ${emailData.subject || 'استفسارك من Mango AI'}`,
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
