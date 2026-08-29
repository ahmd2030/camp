"use server";

import { addLead, LeadData } from "@/services/leads";

const HALAL_BLACKLIST = [
  'bar', 'club', 'liquor', 'pub', 'adult', 'wine', 'tavern',
  'ملهى', 'بار', 'خمارة', 'مرقص', 'ديسكو', 'نادي ليلي', 'مشروبات روحية'
];

export async function scrapeGooglePlaces(searchQuery: string, defaultStatus: 'PENDING' | 'READY_TO_SEND' = 'PENDING', limit: number = 20, start: number = 0) {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'مفتاح SerpApi غير صالح أو لم يتم إعداده في بيئة الإنتاج.' };
    }

    // 1. SerpApi Fetch with Timeout and Pagination
    const url = `https://serpapi.com/search.json?engine=google_local&q=${encodeURIComponent(searchQuery)}&start=${start}&api_key=${apiKey}`;
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
      if (processedCount >= limit) break;

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
        const prompt = `أنت موظف مبيعات B2B خبير تعمل في شركة (Mango AI) المتخصصة في الحلول الرقمية. مساحتك الإبداعية محصورة في صياغة محتوى الرسالة، ولكن الهيكل ثابت.

بيانات العميل:
- اسم الشركة: ${lead.businessName}
- المجال: ${searchQuery}
- التقييم: ${lead.rating}

القواعد الصارمة (System Constraints):
1. يمنع منعاً باتاً استخدام الأقواس المربعة [ ] أو ترك أي متغيرات فارغة.
2. تحدث دائماً بصيغة المتكلم نيابة عن شركة (Mango AI) (مثال: نحن في Mango AI...).
3. لا تقم بإدراج أي روابط (Links) وهمية.
4. المنع القطعي للألفاظ الآلية: ممنوع منعاً باتاً استخدام أي كلمات توحي بأنك نظام آلي (مثل: ذكي، آلي، خوارزميات، روبوت، نظام، ذكاء اصطناعي، بوت) عند الإشارة إلى فريقنا أو طريقة عملنا.
5. التخفي البشري 100%: يجب أن تتقمص شخصية إنسان حقيقي، مدير مبيعات محترف وخبير في عالم B2B، يتحدث نيابة عن كيان مؤسسي.
6. تجنب ديباجات الذكاء الاصطناعي: لا تبدأ الرسالة أبداً بعبارات مثل 'بصفتي...' أو 'لقد قمت بتحليل بياناتكم عبر نظامنا'. بدلاً من ذلك، تحدث كشخص بحث في السوق بنفسه أو لاحظ التقييم بشكل طبيعي.
7. نبرة الصوت: لا تكن مفرطاً في الحماس لدرجة تبدو مصطنعة أو متملقة. استخدم نبرة هادئة، واثقة، ومبنية على الحقائق والمكاسب.
8. يجب أن يكون المخرج النهائي مطابقاً تماماً لهذا الهيكل الحرفي، دون زيادة أو نقصان في التنسيق:

الموضوع: (اكتب موضوعاً جذاباً مخصصاً لمجالهم هنا)

السادة إدارة ${lead.businessName}،
تحية طيبة،

(اكتب هنا 3 فقرات قصيرة جداً: الأولى تحلل مشكلة رقمية في مجالهم بناءً على تقييمهم، الثانية تستفز الحاجة للتغيير، والثالثة تعرض كيف يمكن لشركة Mango AI حل المشكلة)

نتطلع لفرصة التعاون معكم وتحقيق نجاحات جديدة.

مع خالص التحيات،
إدارة تطوير الأعمال
Mango AI`;
        
        let draftMessage = '';
        let finalMessage = '';

        // Request 1: Agent 1 (Sales Rep)
        const response1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

        if (!response1.ok) {
          const errorData = await response1.json();
          throw new Error(errorData.error?.message || `OpenRouter API Error (Agent 1): ${response1.status} ${response1.statusText}`);
        }

        const data1 = await response1.json();
        draftMessage = data1.choices?.[0]?.message?.content || '';

        // Request 2: Agent 2 (CMO)
        const cmoSystemPrompt = `أنت مدير التسويق (CMO) في شركة Mango AI. لقد استلمت للتو مسودة إيميل مبيعات B2B من المندوب.
مهمتك هي تحسين هذا النص ليكون أكثر إقناعاً:
- أضف (Hook) استفزازي جذاب في البداية لجذب الانتباه.
- اجعل لغة النص دافئة، بشرية، وتعتمد على علم النفس البيعي.
- المنع القطعي للألفاظ الآلية: ممنوع منعاً باتاً استخدام أي كلمات توحي بأنك نظام آلي (مثل: ذكي، آلي، خوارزميات، روبوت، نظام، ذكاء اصطناعي، بوت).
- التخفي البشري 100%: تقمص شخصية إنسان حقيقي تماماً. لا تبدأ بعبارات مثل "بصفتي...". نبرة الصوت هادئة، واثقة ومبنية على الحقائق والمكاسب، لا تكن مفرطاً في الحماس.
قاعدة صارمة: حافظ على التوقيع النهائي لـ Mango AI كما هو في المسودة الأصلية تماماً ولا تستخدم أي متغيرات فارغة [ ].
أعد النص المحسن كقطعة واحدة جاهزة.`;

        const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: cmoSystemPrompt },
              { role: "user", content: draftMessage }
            ]
          })
        });

        if (!response2.ok) {
          const errorData2 = await response2.json();
          throw new Error(errorData2.error?.message || `OpenRouter API Error (Agent 2): ${response2.status} ${response2.statusText}`);
        }

        const data2 = await response2.json();
        finalMessage = data2.choices?.[0]?.message?.content || draftMessage;
        
        aiPitch = finalMessage;
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

export async function automateScraping(searchQuery: string, limit: number = 20, start: number = 0) {
  try {
    const result = await scrapeGooglePlaces(searchQuery, 'READY_TO_SEND', limit, start);
    return result;
  } catch (e) {
    console.error("Failed automateScraping", e);
    return { success: false, error: 'حدث خطأ في بدء العمل الآلي' };
  }
}

export async function generatePitch(lead: any, previousMessage?: string) {
  try {
        const prompt = `أنت موظف مبيعات B2B خبير تعمل في شركة (Mango AI) المتخصصة في الحلول الرقمية. مساحتك الإبداعية محصورة في صياغة محتوى الرسالة، ولكن الهيكل ثابت.

بيانات العميل:
- اسم الشركة: ${lead.businessName}
- التقييم: ${lead.rating}

القواعد الصارمة (System Constraints):
1. يمنع منعاً باتاً استخدام الأقواس المربعة [ ] أو ترك أي متغيرات فارغة.
2. تحدث دائماً بصيغة المتكلم نيابة عن شركة (Mango AI) (مثال: نحن في Mango AI...).
3. لا تقم بإدراج أي روابط (Links) وهمية.
4. المنع القطعي للألفاظ الآلية: ممنوع منعاً باتاً استخدام أي كلمات توحي بأنك نظام آلي (مثل: ذكي، آلي، خوارزميات، روبوت، نظام، ذكاء اصطناعي، بوت) عند الإشارة إلى فريقنا أو طريقة عملنا.
5. التخفي البشري 100%: يجب أن تتقمص شخصية إنسان حقيقي، مدير مبيعات محترف وخبير في عالم B2B، يتحدث نيابة عن كيان مؤسسي.
6. تجنب ديباجات الذكاء الاصطناعي: لا تبدأ الرسالة أبداً بعبارات مثل 'بصفتي...' أو 'لقد قمت بتحليل بياناتكم عبر نظامنا'. بدلاً من ذلك، تحدث كشخص بحث في السوق بنفسه أو لاحظ التقييم بشكل طبيعي.
7. نبرة الصوت: لا تكن مفرطاً في الحماس لدرجة تبدو مصطنعة أو متملقة. استخدم نبرة هادئة، واثقة، ومبنية على الحقائق والمكاسب.
8. يجب أن يكون المخرج النهائي مطابقاً تماماً لهذا الهيكل الحرفي، دون زيادة أو نقصان في التنسيق:

الموضوع: (اكتب موضوعاً جذاباً مخصصاً لمجالهم هنا)

السادة إدارة ${lead.businessName}،
تحية طيبة،

(اكتب هنا 3 فقرات قصيرة جداً: الأولى تحلل مشكلة رقمية في مجالهم بناءً على تقييمهم، الثانية تستفز الحاجة للتغيير، والثالثة تعرض كيف يمكن لشركة Mango AI حل المشكلة)

نتطلع لفرصة التعاون معكم وتحقيق نجاحات جديدة.

مع خالص التحيات،
إدارة تطوير الأعمال
Mango AI`;
        
        let draftMessage = '';
        let finalMessage = '';

        const response1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

        if (!response1.ok) {
          throw new Error(`OpenRouter API Error (Agent 1): ${response1.status}`);
        }

        const data1 = await response1.json();
        draftMessage = data1.choices?.[0]?.message?.content || '';

        let cmoSystemPrompt = `أنت مدير التسويق (CMO) في شركة Mango AI. لقد استلمت للتو مسودة إيميل مبيعات B2B من المندوب.
مهمتك هي تحسين هذا النص ليكون أكثر إقناعاً:
- أضف (Hook) استفزازي جذاب في البداية لجذب الانتباه.
- اجعل لغة النص دافئة، بشرية، وتعتمد على علم النفس البيعي.
- المنع القطعي للألفاظ الآلية: ممنوع منعاً باتاً استخدام أي كلمات توحي بأنك نظام آلي (مثل: ذكي، آلي، خوارزميات، روبوت، نظام، ذكاء اصطناعي، بوت).
- التخفي البشري 100%: تقمص شخصية إنسان حقيقي تماماً. لا تبدأ بعبارات مثل "بصفتي...". نبرة الصوت هادئة، واثقة ومبنية على الحقائق والمكاسب، لا تكن مفرطاً في الحماس.
قاعدة صارمة: حافظ على التوقيع النهائي لـ Mango AI كما هو في المسودة الأصلية تماماً ولا تستخدم أي متغيرات فارغة [ ].
أعد النص المحسن كقطعة واحدة جاهزة.`;

        if (previousMessage) {
            cmoSystemPrompt += `\n\nتوجيه عاجل (إعادة استهداف): بما أننا نملك previousMessage للعميل، فهذا يعني أننا نعيد استهداف العميل بعد شهر من التجاهل. قاعدة صارمة: اقرأ الرسالة السابقة، وإياك أن تكرر نفس الهوك (Hook) أو الزاوية البيعية. استخدم مدخلاً نفسياً جديداً تماماً (مثل التركيز على ابتكار جديد، أو إحصائية مخيفة في السوق، أو عرض حصري) لكسر الجليد.`;
        }

        const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: cmoSystemPrompt },
              { role: "user", content: previousMessage ? `الرسالة السابقة التي تجاهلها العميل:\n${previousMessage}\n\nالمسودة الجديدة المراد تحسينها كإعادة استهداف:\n${draftMessage}` : draftMessage }
            ]
          })
        });

        if (!response2.ok) {
          throw new Error(`OpenRouter API Error (Agent 2): ${response2.status}`);
        }

        const data2 = await response2.json();
        finalMessage = data2.choices?.[0]?.message?.content || draftMessage;
        
        return { success: true, aiPitch: finalMessage };
  } catch (error: any) {
    console.error("Error generating pitch:", error);
    return { success: false, error: 'حدث خطأ داخلي غير متوقع أثناء معالجة الطلب.' };
  }
}
