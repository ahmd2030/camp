"use server";

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { chatWithTeamMember } from './team';
import { sendTestEmail } from './sendEmail';

export async function getDueFollowups(mockTimeJump = false) {
  try {
    const q = query(
      collection(db, 'sent_leads'),
      where('hasReplied', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const now = Date.now();
    
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
      .filter(lead => !lead.hasBooked && (lead.followUpStage === undefined || lead.followUpStage < 2));
    
    const dueLeads = leads.filter(lead => {
      if (mockTimeJump) return true;
      
      const lastContact = lead.lastContactedAt || 0;
      const daysSinceContact = (now - lastContact) / (1000 * 60 * 60 * 24);
      
      const stage = lead.followUpStage || 0;
      
      if (stage === 0 && daysSinceContact >= 3) return true;
      if (stage === 1 && daysSinceContact >= 4) return true;
      return false;
    });
    
    return { success: true, leads: dueLeads };
  } catch (error: any) {
    console.error("Error fetching due followups:", error);
    return { success: false, error: error.message };
  }
}

export async function getStats() {
  try {
    const q = query(collection(db, 'sent_leads'));
    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(d => d.data() as any);
    
    const sentTotal = leads.filter(l => (l.followUpStage || 0) > 0).length;
    const closedTotal = leads.filter(l => l.followUpStage === 2 || l.hasReplied || l.hasBooked).length;
    
    return { success: true, sentTotal, closedTotal };
  } catch (e) {
    return { success: false, sentTotal: 0, closedTotal: 0 };
  }
}

export async function processFollowup(leadId: string, leadData: any) {
  try {
     const currentStage = leadData.followUpStage || 0;
     const nextStage = currentStage + 1;
     let prompt = '';
     
     if (nextStage === 1) {
       prompt = `أنت خبير مبيعات B2B. اكتب رسالة تذكير (Follow-up) قصيرة ولطيفة جداً للعميل: ${leadData.businessName}.
الرسالة السابقة التي أرسلناها له كانت:
"${leadData.lastMessage}"
المطلوب: اكتب رسالة تذكير في سطرين فقط، تسأله فيها بلطف إن كان قد وجد وقتاً للاطلاع على الرسالة السابقة. بدون وضع أي روابط جديدة وبدون تعقيد.`;
     } else if (nextStage === 2) {
       prompt = `أنت خبير مبيعات B2B. اكتب "رسالة الوداع" (Break-up Email) للعميل: ${leadData.businessName}.
العميل لم يرد على رسائلنا السابقة. 
المطلوب: اكتب رسالة قصيرة جداً (3 أسطر كحد أقصى) تخبره فيها أنك ستتوقف عن التواصل لأن هذا الوقت قد لا يكون مناسباً له لتطوير أعماله، وتترك الباب مفتوحاً للمستقبل بأسلوب احترافي وراقي جداً. لا تضع أي روابط.`;
     }
     
     const aiRes = await chatWithTeamMember('copywriter', prompt);
     let newMessage = '';
     if (aiRes.success && aiRes.response) {
       newMessage = aiRes.response.trim();
     } else {
       newMessage = nextStage === 1 
        ? "مرحباً، أردت فقط الاطمئنان إن كنت قد تمكنت من قراءة رسالتي السابقة؟" 
        : "يبدو أن هذا الوقت غير مناسب، سأتوقف عن التواصل حالياً. أتمنى لكم التوفيق!";
     }

     // Send email
     await sendTestEmail(newMessage, leadData.clientEmail || 'contact@example.com', leadId);

     // Update DB
     await updateDoc(doc(db, 'sent_leads', leadId), {
       followUpStage: nextStage,
       lastContactedAt: Date.now(),
       lastMessage: newMessage
     });

     return { success: true, stage: nextStage };
  } catch (error: any) {
    console.error("Error processing follow-up:", error);
    return { success: false, error: error.message };
  }
}
