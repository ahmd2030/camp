"use server";

import { addLead, LeadData } from "@/services/leads";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const HALAL_BLACKLIST = [
  'bar', 'club', 'liquor', 'pub', 'adult', 'wine', 'tavern',
  'ملهى', 'بار', 'خمارة', 'مرقص', 'ديسكو', 'نادي ليلي', 'مشروبات روحية'
];

export async function processLead(rawLead: {
  businessName: string;
  category: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  website: string;
}) {
  try {
    // 1. الفلتر الإسلامي الصارم (Halal Filter)
    const textToCheck = `${rawLead.businessName} ${rawLead.category}`.toLowerCase();
    const isProhibited = HALAL_BLACKLIST.some(word => textToCheck.includes(word.toLowerCase()));
    
    if (isProhibited) {
      console.log(`[Halal Filter] Rejected lead: ${rawLead.businessName}`);
      return { success: false, error: 'تم التجاهل: النشاط التجاري غير متوافق (محتوى محظور)' };
    }

    // 2. تحليل نقطة الألم (Pain Point Analysis)
    let painPoint = "بحاجة إلى تحسين التواجد الرقمي";
    if (rawLead.reviewsCount < 20) {
      painPoint = "عدد التقييمات قليل جداً، يفقد الثقة أمام المنافسين";
    } else if (rawLead.rating < 4.0) {
      painPoint = "التقييم العام منخفض، مما يؤثر على جذب العملاء";
    } else if (!rawLead.website || rawLead.website === 'غير متوفر') {
      painPoint = "لا يوجد موقع إلكتروني للنشاط";
    }

    // 3. صياغة العرض باستخدام الذكاء الاصطناعي (AI Pitch Generation)
    // We try to use Gemini, but provide a fallback just in case of API issues
    let aiPitch = `مرحباً، لاحظنا أن ${rawLead.businessName} يعاني من: ${painPoint}. لدينا الحل الأمثل لزيادة مبيعاتك بنسبة 300%. جرب نظامنا هنا: [رابط الإحالة]`;

    try {
      const prompt = `أنت خبير تسويق (Affiliate Marketer). النشاط التجاري اسمه: ${rawLead.businessName} ومجاله: ${rawLead.category}. 
      المشكلة لديه (Pain point): ${painPoint}.
      اكتب رسالة واتساب قصيرة جداً (لا تتجاوز 4 أسطر) لاستهداف هذا النشاط وإقناعه باستخدام برنامج الإدارة/الفوترة الخاص بنا لحل المشكلة.
      اختم الرسالة بعبارة تدعوه للتسجيل عبر الرابط التالي: [LINK]
      تحدث بلهجة سعودية احترافية.`;

      const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: prompt,
      });
      aiPitch = text;
    } catch (aiError) {
      console.error("AI Generation failed, using fallback pitch", aiError);
    }

    // 4. حفظ الهدف في قاعدة البيانات (Save Lead)
    const newLead: LeadData = {
      businessName: rawLead.businessName,
      phone: rawLead.phone,
      rating: rawLead.rating,
      reviewsCount: rawLead.reviewsCount,
      website: rawLead.website,
      painPoint,
      aiPitch,
      status: 'PENDING'
    };

    const result = await addLead(newLead);
    
    if (result.success) {
      return { success: true, lead: { ...newLead, id: result.id } };
    } else {
      return { success: false, error: "فشل حفظ البيانات" };
    }

  } catch (error: any) {
    console.error("Error processing lead:", error);
    return { success: false, error: error.message };
  }
}
