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
      return { success: false, error: 'مفتاح Google Places API غير صالح أو لم يتم إعداده في بيئة الإنتاج.' };
    }

    // 1. Google Places Fetch with Timeout
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    let data;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      data = await response.json();
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'انتهت مهلة الاتصال بخوادم جوجل (Timeout). يرجى المحاولة مرة أخرى.' };
      }
      return { success: false, error: 'فشل الاتصال بخوادم جوجل. تأكد من إعدادات الشبكة.' };
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API Error:', data.status, data.error_message);
      if (data.status === 'REQUEST_DENIED') {
        return { success: false, error: 'رفضت جوجل الطلب (REQUEST_DENIED). تأكد من صلاحية مفتاح API وربط حساب الفوترة.' };
      }
      return { success: false, error: `فشل جلب البيانات من خرائط جوجل: ${data.status}` };
    }

    const results = data.results || [];
    if (results.length === 0) {
      return { success: false, error: 'لم يتم العثور على أي نتائج مطابقة لبحثك في خرائط جوجل.' };
    }

    let processedCount = 0;
    const leadsToProcess = [];

    // Filter and prepare leads
    for (const place of results) {
      if (processedCount >= 5) break; // قللنا العدد إلى 5 لتجنب الـ Timeout في Vercel

      const businessName = place.name || 'بدون اسم';
      const category = (place.types || []).join(' ');
      
      const textToCheck = `${businessName} ${category}`.toLowerCase();
      const isProhibited = HALAL_BLACKLIST.some(word => textToCheck.includes(word.toLowerCase()));
      
      if (isProhibited) continue;

      const rating = place.rating || 0;
      const reviewsCount = place.user_ratings_total || 0;
      const website = "غير متوفر";
      
      let painPoint = "بحاجة إلى تحسين التواجد الرقمي";
      if (reviewsCount < 20) painPoint = "عدد التقييمات قليل جداً، يفقد الثقة أمام المنافسين";
      else if (rating < 4.0) painPoint = "التقييم العام منخفض، مما يؤثر على جذب العملاء";

      leadsToProcess.push({ businessName, rating, reviewsCount, website, painPoint });
      processedCount++;
    }

    if (leadsToProcess.length === 0) {
      return { success: false, error: 'جميع النتائج المسترجعة لم تتجاوز الفلتر الإسلامي وتم استبعادها.' };
    }

    // 2. Concurrent AI Generation with Fallback
    const finalLeads = await Promise.all(leadsToProcess.map(async (lead) => {
      let aiPitch = `مرحباً، لاحظنا أن ${lead.businessName} يعاني من: ${lead.painPoint}. لدينا الحل الأمثل لزيادة مبيعاتك. جرب نظامنا هنا: [رابط الإحالة]`;
      
      try {
        const prompt = `أنت خبير تسويق (Affiliate Marketer). النشاط التجاري اسمه: ${lead.businessName}. المشكلة لديه: ${lead.painPoint}. اكتب رسالة واتساب قصيرة جداً (لا تتجاوز 4 أسطر) لاستهداف هذا النشاط وإقناعه باستخدام برنامجنا. اختم بـ: [LINK] تحدث بلهجة سعودية احترافية.`;
        
        // Timeout for AI SDK
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds per AI call
        
        const { text } = await generateText({
          model: google('gemini-1.5-flash'),
          prompt: prompt,
          abortSignal: controller.signal
        });
        clearTimeout(timeoutId);
        aiPitch = text;
      } catch (aiError: any) {
        console.error(`AI Timeout/Error for ${lead.businessName}`, aiError.name);
        // We gracefully fallback to the hardcoded pitch if AI times out, so UI doesn't freeze
      }

      const newLead: LeadData = {
        businessName: lead.businessName,
        phone: "يتطلب تفاصيل أكثر",
        rating: lead.rating,
        reviewsCount: lead.reviewsCount,
        website: lead.website,
        painPoint: lead.painPoint,
        aiPitch,
        status: 'PENDING'
      };

      const result = await addLead(newLead);
      return { ...newLead, id: result.success ? result.id : Date.now().toString() };
    }));

    return { success: true, count: finalLeads.length, leads: finalLeads };

  } catch (error: any) {
    console.error("Critical Error scraping Google Places:", error);
    return { success: false, error: 'حدث خطأ داخلي غير متوقع أثناء معالجة الطلب.' };
  }
}
