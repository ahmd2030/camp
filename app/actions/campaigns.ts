"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { generatePitch } from './scraper';
import { sendTestEmail } from './sendEmail';

export async function queueAffiliateLead(lead: any): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const { chatWithTeamMember } = await import('./team');
    const { logSmartError } = await import('./monitor');

    // 1. Ask CMO to suggest affiliate platform
    const platformPrompt = `أنت خبير شراكات استراتيجي (CMO).
المهمة: يجب تحليل مجال هذه الشركة بدقة واقتراح منصة إحالة منطقية وحقيقية تناسب مجالها تماماً.
- للشركات الخدمية والمحلية (مثل النظافة، الصيانة): اقترح برامج تسويق B2B، أنظمة إدارة CRM، أو أدوات مالية.
- للتجارة الإلكترونية: اقترح منصات مثل Admitad, ArabyAds, أو ShareASale.
يُمنع منعاً باتاً تكرار نفس المنصة لكل العملاء. فكر بعمق.
المجال: ${lead.businessName}
أرجع النتيجة بصيغة JSON فقط: {"platform": "اسم المنصة المقترحة"}`;
    
    let platformName = "ClickBank";
    try {
      const chatRes = await chatWithTeamMember('cmo', platformPrompt + " \nأرجع النتيجة بصيغة JSON فقط.");
      if (chatRes.success && chatRes.response) {
        const cleanText = chatRes.response.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(cleanText);
        if (parsed.platform) platformName = parsed.platform;
      }
    } catch (e) {
      console.error("Failed to get platform suggestion:", e);
    }

    // 2. Prepare the email draft with placeholder
    let pitch = lead.aiPitch;
    if (!pitch) {
      const generated = await generatePitch(lead);
      if (generated && generated.aiPitch) pitch = generated.aiPitch;
    }
    
    // Replace hardcoded referral link with placeholder if present, or just append it
    if (pitch.includes('[رابط الإحالة]')) {
      pitch = pitch.replace(/\[رابط الإحالة\]/g, '[INSERT_AFFILIATE_LINK_HERE]');
    } else {
      pitch += '\n\n[INSERT_AFFILIATE_LINK_HERE]';
    }

    // 3. Save to requests collection
    await addDoc(collection(db, 'requests'), {
      status: 'PENDING_AFFILIATE',
      customerEmail: lead.email || "contact@example.com",
      customerRequest: 'تم اصطياد هذه الفرصة عبر الطيار الآلي لشركة: ' + lead.businessName,
      aiDraftResponse: pitch,
      platform: platformName,
      createdAt: Timestamp.now()
    });

    return { success: true, message: 'تم تحويل المهمة لقسم قيد الانتظار بنجاح' };
  } catch (error: any) {
    console.error("Error queueing affiliate lead:", error);
    return { success: false, message: 'حدث خطأ أثناء تحويل الفرصة.', error: error.message };
  }
}

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
    const emailResult = await sendTestEmail(pitch, lead.email || "test@example.com", lead.id);
    
    if (!emailResult.success) {
      return { success: false, message: 'فشل إرسال البريد الإلكتروني.' };
    }

    // 3. Save to sent_leads collection to avoid duplicates and track analytics
    // Initialize Smart Drip Fields
    await addDoc(collection(db, 'sent_leads'), {
      leadId: lead.id,
      businessName: lead.businessName,
      clientEmail: lead.email || '',
      sentAt: new Date().toISOString(),
      lastMessage: pitch,
      campaign: 'bulk_auto',
      followUpStage: 0,
      lastContactedAt: Date.now(),
      hasReplied: false,
      hasBooked: false,
      opened: false
    });

    return { success: true, message: 'تم إرسال الرسالة بنجاح' };

  } catch (error: any) {
    console.error(`Error processing campaign lead ${lead.id}:`, error);
    return { success: false, message: 'حدث خطأ غير متوقع أثناء معالجة هذا العميل.', error: error.message };
  }
}

export async function markSmartStop(identifier: string, type: 'reply' | 'booking') {
  if (!identifier) return;
  try {
    const leadsRef = collection(db, 'sent_leads');
    // Try matching by businessName (or email if we had it, but booking primarily gives name and email)
    // We'll query both potential matches if possible, but Firestore requires composite indexes for OR.
    // For simplicity, we query by businessName, or if it looks like an email, we could query clientEmail.
    // Let's just fetch all and filter in memory if small, or do two queries.
    
    // Query 1: by businessName
    const q1 = query(leadsRef, where('businessName', '==', identifier));
    const snap1 = await getDocs(q1);
    
    // Query 2: by clientEmail (if identifier has @)
    let snap2 = { docs: [] as any[] };
    if (identifier.includes('@')) {
      const q2 = query(leadsRef, where('clientEmail', '==', identifier));
      snap2 = await getDocs(q2);
    }

    const docsToUpdate = new Map();
    snap1.forEach(d => docsToUpdate.set(d.id, d));
    snap2.docs.forEach(d => docsToUpdate.set(d.id, d));

    for (const [docId, docSnap] of docsToUpdate) {
      const updateData = type === 'reply' ? { hasReplied: true } : { hasBooked: true };
      await updateDoc(doc(db, 'sent_leads', docId), updateData);
    }
  } catch (error) {
    console.error("Error in Smart Stop:", error);
  }
}
