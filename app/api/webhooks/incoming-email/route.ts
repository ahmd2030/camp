import { NextResponse } from 'next/server';
import { executeAction } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/execute';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Resend webhook payload
    // Resend sends { from, to, subject, text, html } inside the payload or directly
    const emailData = payload.data || payload; 
    const sender = emailData.from;
    const textBody = emailData.text || emailData.html || '';

    if (!sender || !textBody) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Pass the message to the CMO for a smart auto-reply
    const prompt = `
استلمنا رسالة من عميل بريده الإلكتروني: ${sender}.
نص الرسالة:
"""
${textBody}
"""

مهمتك: صياغة رد احترافي ومناسب على استفسار هذا العميل (مثلاً عن كيفية التسجيل أو تفاصيل المنتج). 
اكتب نص الرسالة فقط بدون أي مقدمات لك، لأن نصك سيتم إرساله مباشرة كبريد إلكتروني للعميل.
`;

    const aiResponse = await executeAction('cmo', prompt);

    if (aiResponse) {
      // Send the reply back to the customer
      await executeEmailAction({
        to: sender,
        subject: `رد على استفسارك - ${emailData.subject || 'دعم العملاء'}`,
        html: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
          ${aiResponse.replace(/\n/g, '<br>')}
        </div>`
      });
      return NextResponse.json({ success: true, message: 'Auto-reply sent successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'AI failed to generate reply' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
