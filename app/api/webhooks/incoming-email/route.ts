import { NextResponse } from 'next/server';
import { chatWithTeamMember } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Resend webhook payload
    const emailData = payload.data || payload; 
    const sender = emailData.from;
    const textBody = emailData.text || emailData.html || '';

    if (!sender || !textBody) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const prompt = `استلمنا رسالة من عميل بريده الإلكتروني: ${sender}.
نص الرسالة:
"""
${textBody}
"""

مهمتك: صياغة رد احترافي ومناسب على استفسار هذا العميل (مثلاً عن كيفية التسجيل أو تفاصيل المنتج). 
اكتب نص الرسالة فقط بدون أي مقدمات لك، لأن نصك سيتم إرساله مباشرة كبريد إلكتروني للعميل.`;

    const aiResponse = await chatWithTeamMember('cmo', prompt, []);

    if (aiResponse && aiResponse.success && aiResponse.response) {
      await executeEmailAction(
        sender,
        `رد على استفسارك - ${emailData.subject || 'دعم العملاء'}`,
        `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
          ${aiResponse.response.replace(/\n/g, '<br>')}
        </div>`
      );
      return NextResponse.json({ success: true, message: 'Auto-reply sent successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'AI failed to generate reply' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
