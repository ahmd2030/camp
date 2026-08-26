"use server";

import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

export async function executeEmailAction(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'مفتاح RESEND_API_KEY غير متوفر في إعدادات الخادم.' };
  }

  try {
    const data = await resend.emails.send({
      from: 'Mango AI <info@mangosai.co>',
      to,
      reply_to: 'ai@reply.mangosai.co',
      subject,
      html
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return { success: false, error: error.message || 'حدث خطأ غير معروف أثناء إرسال البريد.' };
  }
}
