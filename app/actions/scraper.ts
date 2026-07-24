"use server";

import { addLead, LeadData } from "@/services/leads";

const HALAL_BLACKLIST = [
  'bar', 'club', 'liquor', 'pub', 'adult', 'wine', 'tavern',
  'ملهى', 'بار', 'خمارة', 'مرقص', 'ديسكو', 'نادي ليلي', 'مشروبات روحية'
];

export async function scrapeGooglePlaces(searchQuery: string, defaultStatus: 'PENDING' | 'READY_TO_SEND' = 'PENDING') {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'مفتاح SerpApi غير صالح أو لم يتم إعداده في بيئة الإنتاج.' };
    }

    // 1. SerpApi Fetch with Timeout
    const url = `https://serpapi.com/search.json?engine=google_local&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
    let data;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds timeout
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      data = await response.json();
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'انتهت مهلة الاتصال بخوادم SerpApi (Timeout). يرجى المحاولة مرة أخرى.' };
      }
      return { success: false, error: 'فشل الاتصال بخوادم SerpApi. تأكد من إعدادات الشبكة.' };
    }

    if (data.error) {
      console.error('SerpApi Error:', data.error);
      return { success: false, error: `فشل جلب البيانات من SerpApi: ${data.error}` };
    }

    const results = data.local_results || [];
    if (results.length === 0) {
      return { success: false, error: 'لم يتم العثور على أي نتائج مطابقة لبحثك في خرائط جوجل.' };
    }

    let processedCount = 0;
    const leadsToProcess = [];

    // Filter and prepare leads
    for (const place of results) {
      if (processedCount >= 5) break; // قللنا العدد إلى 5 لتجنب الـ Timeout في Vercel

      const businessName = place.title || 'بدون اسم';
      const category = place.type || '';
      
      const textToCheck = `${businessName} ${category}`.toLowerCase();
      const isProhibited = HALAL_BLACKLIST.some(word => textToCheck.includes(word.toLowerCase()));
      
      if (isProhibited) continue;

      const rating = place.rating || 0;
      const reviewsCount = place.reviews || 0;
      const website = place.website || "غير متوفر";
      
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
        const prompt = `أنت موظف مبيعات ذكي وخبير استراتيجي تعمل في شركة (Mango AI) الرائدة في الحلول الرقمية.
بيانات العميل المستهدف الآن هي:

اسم الشركة: ${lead.businessName}

مجال العمل (Niche): ${searchQuery}

تقييم خرائط جوجل: ${lead.rating}

مهمتك:

ادرس (مجال عمل العميل) و(تقييمه). فكر كخبير: ما هي أكبر مشكلة يواجهها هذا المجال تحديداً في السوق الرقمي؟

اكتب رسالة إيميل مخصصة 100% لهذا العميل تناقش مشكلته الخاصة بمجاله (مثلاً: المطاعم تختلف عن العيادات، تختلف عن شركات المقاولات).

اقترح كيف يمكن لشركة (Mango AI) حل هذه المشكلة الخاصة به.

اكتب بأسلوب بشري، لبق، واحترافي. لا تستخدم أي قوالب محفوظة.

ممنوع منعاً باتاً استخدام أي أقواس أو متغيرات فارغة مثل [اسمك] أو [رابط].

اختم الرسالة حصراً بهذا التوقيع المعتمد:

فريق المبيعات الذكي
Mango AI
الرائدة في الحلول الرقمية`;
        
        let text;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        text = data.choices?.[0]?.message?.content || '';
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
        status: defaultStatus
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

export async function automateScraping(searchQuery: string) {
  // Fire and forget (or fast await since we limit to 5 leads)
  // We await it here so that Vercel doesn't kill it prematurely if this is called from client directly,
  // but for the UI, we can just return success immediately and not wait for the client.
  // Actually, NextJS server actions must return a promise if we want the client to finish. 
  // We will let the client handle it async or just await it.
  try {
    const result = await scrapeGooglePlaces(searchQuery, 'READY_TO_SEND');
    return result;
  } catch (e) {
    console.error("Failed automateScraping", e);
    return { success: false, error: 'حدث خطأ في بدء العمل الآلي' };
  }
}

