"use server";

import { addLead, LeadData } from "@/services/leads";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const HALAL_BLACKLIST = [
  'bar', 'club', 'liquor', 'pub', 'adult', 'wine', 'tavern',
  'ملهى', 'بار', 'خمارة', 'مرقص', 'ديسكو', 'نادي ليلي', 'مشروبات روحية'
];

export async function scrapeGooglePlaces(searchQuery: string) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
      return { success: false, error: 'مفتاح Google Places API غير صالح أو غير موجود.' };
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google API Error:', data.status, data.error_message);
      return { success: false, error: `فشل جلب البيانات من خرائط جوجل: ${data.status}` };
    }

    const results = data.results || [];
    let addedLeads = [];
    let processedCount = 0;

    for (const place of results) {
      if (processedCount >= 10) break; // أقصى حد 10 أهداف لتسريع الاستجابة

      const businessName = place.name || 'بدون اسم';
      const category = (place.types || []).join(' ');
      
      // 1. الفلتر الإسلامي الصارم (Halal Filter)
      const textToCheck = `${businessName} ${category}`.toLowerCase();
      const isProhibited = HALAL_BLACKLIST.some(word => textToCheck.includes(word.toLowerCase()));
      
      if (isProhibited) {
        console.log(`[Halal Filter] Rejected lead: ${businessName}`);
        continue;
      }

      // 2. تحليل نقطة الألم (Pain Point Analysis)
      const rating = place.rating || 0;
      const reviewsCount = place.user_ratings_total || 0;
      // Places Text Search doesn't return website by default, but we assume "غير متوفر" for simplicity without a Place Details call
      const website = "غير متوفر";
      
      let painPoint = "بحاجة إلى تحسين التواجد الرقمي";
      if (reviewsCount < 20) {
        painPoint = "عدد التقييمات قليل جداً، يفقد الثقة أمام المنافسين";
      } else if (rating < 4.0) {
        painPoint = "التقييم العام منخفض، مما يؤثر على جذب العملاء";
      }

      // 3. صياغة العرض باستخدام الذكاء الاصطناعي (AI Pitch Generation)
      let aiPitch = `مرحباً، لاحظنا أن ${businessName} يعاني من: ${painPoint}. لدينا الحل الأمثل لزيادة مبيعاتك بنسبة 300%. جرب نظامنا هنا: [رابط الإحالة]`;

      try {
        const prompt = `أنت خبير تسويق (Affiliate Marketer). النشاط التجاري اسمه: ${businessName} 
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
        businessName: businessName,
        phone: "يتطلب تفاصيل أكثر", // Text Search doesn't return formatted_phone_number
        rating: rating,
        reviewsCount: reviewsCount,
        website: website,
        painPoint,
        aiPitch,
        status: 'PENDING'
      };

      const result = await addLead(newLead);
      if (result.success) {
        addedLeads.push({ ...newLead, id: result.id });
        processedCount++;
      }
    }

    return { success: true, count: addedLeads.length, leads: addedLeads };

  } catch (error: any) {
    console.error("Error scraping Google Places:", error);
    return { success: false, error: error.message };
  }
}
