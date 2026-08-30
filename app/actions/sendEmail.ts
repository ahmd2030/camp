"use server";

import { Resend } from 'resend';

export async function sendTestEmail(emailBody: string, toEmail: string = "test@example.com", leadId?: string) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { success: false, error: 'مفتاح Resend غير موجود في بيئة العمل' };
    }
    
    const resend = new Resend(resendApiKey);

    const formattedBody = emailBody.replace(/\n/g, '<br />');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { background-color: #f9f9f9; font-family: Arial, sans-serif; padding: 40px 20px; margin: 0; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }
          .header { padding: 30px; text-align: center; border-bottom: 1px solid #eee; }
          .header h1 { margin: 0; font-size: 28px; color: #1f2937; }
          .header h1 span { color: #f59e0b; }
          .content { padding: 30px; font-size: 16px; line-height: 1.8; color: #374151; }
          .footer { padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; background-color: #fcfcfc; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Mango <span>AI</span></h1>
          </div>
          <div class="content">
            ${formattedBody}
          </div>
          <div class="footer">
            &copy; 2024 Mango AI. جميع الحقوق محفوظة.
          </div>
        </div>
      </body>
      </html>
    `;

    // Append Tracking Pixel if leadId is provided
    let finalHtmlContent = htmlContent;
    if (leadId) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://mangosai.co'));
      const trackingPixel = `<img src="${appUrl}/api/track?lead_id=${leadId}" width="1" height="1" style="display:none;" />`;
      finalHtmlContent = finalHtmlContent.replace('</body>', `${trackingPixel}\n</body>`);
    }

    const { data, error } = await resend.emails.send({
      from: 'Mango AI <info@mangosai.co>',
      to: [toEmail],
      replyTo: 'ai@reply.mangosai.co',
      subject: 'رسالة تسويقية ذكية من Mango AI 🚀',
      html: finalHtmlContent,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل إرسال البريد الإلكتروني' };
  }
}

