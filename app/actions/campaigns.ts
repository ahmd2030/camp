"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { generatePitch } from './scraper';
import { sendTestEmail } from './sendEmail';

export async function processCampaignLead(lead: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // 1. Generate Pitch (AI Orchestration)
    let pitch = lead.aiPitch;
    if (!pitch) {
      const generated = await generatePitch(lead);
      if (generated && generated.aiPitch) {
        pitch = generated.aiPitch;
      } else {
        return { success: false, message: 'فشل توليد محتوى الرسالة عبر الذكاء الاصطناعي.' };
      }
    }

    // 2. Send Email
    // Note: sendTestEmail takes 'message' and currently hardcodes 'to' for testing.
    // In production, you would pass lead.businessName and a dynamic 'to' address.
    const emailResult = await sendTestEmail(pitch);
    
    if (!emailResult.success) {
      return { success: false, message: 'فشل إرسال البريد الإلكتروني.' };
    }

    // 3. Save to sent_leads collection to avoid duplicates and track analytics
    await addDoc(collection(db, 'sent_leads'), {
      leadId: lead.id,
      businessName: lead.businessName,
      sentAt: new Date().toISOString(),
      lastMessage: pitch,
      campaign: 'bulk_auto'
    });

    return { success: true, message: 'تم إرسال الرسالة بنجاح' };

  } catch (error: any) {
    console.error(`Error processing campaign lead ${lead.id}:`, error);
    return { success: false, message: 'حدث خطأ غير متوقع أثناء معالجة هذا العميل.', error: error.message };
  }
}
