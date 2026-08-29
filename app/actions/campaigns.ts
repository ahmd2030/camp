"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { generatePitch } from './scraper';
import { sendTestEmail } from './sendEmail';

export async function queueAffiliateLead(lead: any, customProduct?: string | null): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const { chatWithTeamMember } = await import('./team');
    const { logSmartError } = await import('./monitor');

    let productName = customProduct || "منتج تسويقي";
    let affiliateSignupUrl = `https://www.google.com/search?q=affiliate+program`;
    let strategyGuide = "استخدم الرابط المرفق للتسجيل في برنامج الإحالة لهذا المنتج وابدأ الترويج.";
    
    // 1. Ask CMO to suggest specific affiliate product ONLY if no custom product is provided
    if (!customProduct) {
      const platformPrompt = `أنت خبير شراكات استراتيجي (CMO).
المهمة: اقتراح "منتج برمجي أو خدمة SaaS محددة بالاسم" للترويج لها بالعمولة لشركة تعمل في مجال: ${lead.businessName}.
يجب أن يكون منتجاً محدداً (مثل أدوات تصميم، برامج محاسبة، إلخ). لا تقترح منصات عامة مثل ClickBank.
مهم جداً: أرجع النتيجة بصيغة JSON فقط وفي سطر واحد (One Line JSON) بدون أي أسطر جديدة (Raw Newlines). استخدم الرمز \\n إذا أردت سطر جديد داخل النص.
{
  "productName": "اسم المنتج فقط",
  "affiliateSignupUrl": "الرابط المباشر لصفحة التسجيل كمسوق (Affiliate) لهذا المنتج",
  "strategyGuide": "دليل سريع من 4 نقاط: 1. ما هو المنتج 2. لماذا يناسب هذا العميل 3. كيفية التسجيل 4. الخدمة التي يجب التركيز عليها. (استخدم \\n للنزول سطر)"
}`;
      
      try {
        const chatRes = await chatWithTeamMember('cmo', platformPrompt);
        if (chatRes.success && chatRes.response) {
          const cleanText = chatRes.response.replace(/```json/gi, '').replace(/```/gi, '').trim();
          const parsed = JSON.parse(cleanText);
          if (parsed.productName && parsed.productName !== '') productName = parsed.productName;
          if (parsed.strategyGuide && parsed.strategyGuide !== '') strategyGuide = parsed.strategyGuide;
          
          if (parsed.affiliateSignupUrl && parsed.affiliateSignupUrl.startsWith('http')) {
            affiliateSignupUrl = parsed.affiliateSignupUrl;
          } else {
            affiliateSignupUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' affiliate program sign up')}`;
          }
        } else {
           affiliateSignupUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' affiliate program sign up')}`;
        }
      } catch (e) {
        console.error("Failed to get product suggestion or JSON parse failed:", e);
        affiliateSignupUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + ' affiliate program sign up')}`;
      }
    } else {
       // Custom product logic
       const isUrl = customProduct.startsWith('http');
       productName = isUrl ? "المنتج المخصص (عبر الرابط)" : customProduct;
       affiliateSignupUrl = isUrl ? customProduct : `https://www.google.com/search?q=${encodeURIComponent(customProduct + ' affiliate program')}`;
       strategyGuide = `أنت تستخدم منتجاً مخصصاً. رابط الإحالة الخاص بك هو: ${isUrl ? customProduct : 'غير متوفر'}. الرجاء التحقق منه قبل الإرسال.`;
    }

    // 2. Prepare the Drip Bait Email
    const baitPrompt = `أنت خبير مبيعات ومسوق بالعمولة ذكي جداً.
المهمة: اكتب إيميل افتتاحي (Drip Bait) قصير جداً وودي للعميل المستهدف: ${lead.businessName}.
المنتج الذي نود تسويقه لاحقاً هو: ${productName}.
قاعدة صارمة جداً: هذا هو الإيميل الأول، **لا تقم أبداً** بوضع أي رابط فيه. لا تقل "تفضل بزيارة هذا الرابط" ولا تضع [رابط].
الهدف من هذا الإيميل هو فقط طرح "سؤال استكشافي" ذكي يلمس نقطة ألم العميل ويجعله يرد بـ "نعم" أو "أخبرني المزيد".
مثال: "مرحباً، لاحظت مطعمكم الجميل... هل تفكرون في نظام نقاط بيع أسرع؟"
اكتب الإيميل مباشرة (موضوع الإيميل ثم النص) بدون أي شروحات، وبدون استخدام روابط.`;

    let pitch = lead.aiPitch;
    try {
      const chatRes = await chatWithTeamMember('copywriter', baitPrompt);
      if (chatRes.success && chatRes.response) {
        pitch = chatRes.response.trim();
      }
    } catch (e) {
      console.error("Failed to generate bait pitch:", e);
    }
    
    // Fallback if the AI accidentally still put a placeholder
    if (pitch.includes('[رابط الإحالة]')) {
      pitch = pitch.replace(/\[رابط الإحالة\]/g, '');
    }

    // 3. Save to requests collection
    await addDoc(collection(db, 'requests'), {
      status: 'PENDING_AFFILIATE',
      customerEmail: lead.email || "contact@example.com",
      customerRequest: 'تم اصطياد هذه الفرصة عبر الطيار الآلي لشركة: ' + lead.businessName,
      aiDraftResponse: pitch,
      productName: productName,
      affiliateSignupUrl: affiliateSignupUrl,
      strategyGuide: strategyGuide,
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
