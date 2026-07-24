"use server";

import { Resend } from 'resend';

export async function sendTestEmail(emailBody: string, toEmail: string = "test@example.com") {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { success: false, error: 'مفتاح Resend غير موجود في بيئة العمل' };
    }
    
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: 'Mango AI <onboarding@resend.dev>',
      to: ['ahmd.alyazidi2030@gmail.com'],
      subject: 'رسالة تسويقية ذكية من Mango AI 🚀',
      text: emailBody,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل إرسال البريد الإلكتروني' };
  }
}
