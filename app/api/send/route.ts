import { NextResponse } from 'next/server';
import { getReadyLeads, updateLeadStatus } from '@/services/leads';
import { Resend } from 'resend';

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY غير متوفر. الرجاء إضافته في إعدادات البيئة.' }, { status: 500 });
    }
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    const leads = await getReadyLeads();
    
    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, message: "لا يوجد أهداف جاهزة للإرسال حالياً.", sent: 0, failed: 0 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const lead of leads) {
      if (!lead.email) {
        // Skip leads without email
        continue;
      }

      try {
        const emailContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>مرحباً ${lead.businessName}،</h2>
            <p>لقد لاحظنا من خلال دراستنا أن هناك فرصة كبيرة لتحسين مبيعاتكم وحل مشكلة: <strong>${lead.painPoint}</strong>.</p>
            <p>${lead.aiPitch}</p>
            <br/>
            <p>تحياتنا،</p>
            <p>فريق العمل</p>
          </div>
        `;

        await resend.emails.send({
          from: 'Acme <onboarding@resend.dev>',
          to: [lead.email],
          subject: 'فرصة لتحسين مبيعاتكم',
          html: emailContent
        });

        if (lead.id) {
          await updateLeadStatus(lead.id, 'PITCH_SENT');
        }
        sentCount++;
      } catch (err) {
        console.error(`Failed to send email to ${lead.email}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "اكتملت عملية الإرسال", 
      sent: sentCount, 
      failed: failedCount,
      totalScanned: leads.length
    });

  } catch (error: any) {
    console.error("Error in sender agent:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
