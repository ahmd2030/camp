"use server";

import { getActiveNiches, addNiches, SuggestedNiche } from "@/services/niches";

export async function getAndFillNiches(): Promise<{ success: boolean; niches?: SuggestedNiche[]; error?: string }> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'مفتاح OPENROUTER_API_KEY مفقود في إعدادات Vercel. يرجى إضافته.' };
    }

    // 1. Fetch active niches
    const activeResult = await getActiveNiches();
    if (!activeResult.success) {
      return { success: false, error: activeResult.error || 'فشل في الاتصال بقاعدة البيانات لجلب المجالات الحالية.' };
    }

    let activeNiches = activeResult.data || [];
    const deficit = 10 - activeNiches.length;
    
    // 2. If we have 10, return them directly
    if (deficit <= 0) {
      return { success: true, niches: activeNiches.slice(0, 10) };
    }

    // Micro-batch: Request a max of 3 niches to avoid Vercel timeout on free tier (10s limit)
    const batchSize = Math.min(3, deficit);

    // 3. Otherwise, generate the deficit
    const currentMonth = new Date().toLocaleString('ar-EG', { month: 'long' });
    const prompt = `أنت محلل أعمال (Business Analyst) لشركة تقدم نظام CRM ذكي وفوترة. 
نحن في شهر ${currentMonth}.
لدينا حالياً ${activeNiches.length} مجالات نشطة. نريد اقتراح ${batchSize} مجالات تجارية (Niches) جديدة في السعودية يكون الطلب عليها عالياً في هذا الوقت من السنة، والتي تعاني عادة من نقص في التنظيم الرقمي، لتكون أهدافاً لحملاتنا التسويقية بالعمولة.

تأكد ألا تتكرر مع المجالات التالية إن وجدت: ${activeNiches.map(n => n.title).join('، ')}.

لكل مجال، حدد:
1. title: اسم المجال (مثل: شركات التكييف، نقل العفش، عيادات الأسنان)
2. searchQuery: كلمة البحث لاستخدامها في Google Maps (مثل: "شركات تكييف في الرياض")
3. justification: مبرر الطلب الموسمي (سطر واحد)
4. expectedCommission: حجم العمولة المتوقع (مثل: "عالية جداً"، "متوسطة")
5. painPoint: نقطة الألم الحالية للتاجر في هذا المجال (سطر واحد)`;

    const { chatWithTeamMember, continueChatWithSearch } = await import('@/app/actions/team');
    const { logSmartError } = await import('@/app/actions/monitor');

    let finalResponseText = '';
    
    try {
      const chatRes = await chatWithTeamMember('analyst', prompt + " \nأرجع النتيجة بصيغة JSON فقط تحتوي على مصفوفة niches.");
      if (!chatRes.success) {
        throw new Error(chatRes.error || "Server Error from Analyst");
      }

      finalResponseText = chatRes.response || '';

      if (chatRes.isSearching) {
        // Handle search
        const fullHistoryForSearch = [{ role: 'user' as const, content: prompt }];
        const searchRes = await continueChatWithSearch('analyst', fullHistoryForSearch, chatRes.assistantMessage, chatRes.query || '');
        if (!searchRes.success) {
          throw new Error(searchRes.error || "Server Error during search");
        }
        finalResponseText = searchRes.response || '';
      }

      if (!finalResponseText) {
        throw new Error("لم يرجع المحلل أي بيانات نصية.");
      }
    } catch (chatError: any) {
      await logSmartError("Autopilot (Analyst) Error: " + (chatError.message || "Unknown error"));
      throw chatError;
    }

    let object: any = { niches: [] };
    try {
      // Find the first { and the last } to extract JSON
      const startIdx = finalResponseText.indexOf('{');
      const endIdx = finalResponseText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = finalResponseText.substring(startIdx, endIdx + 1);
        object = JSON.parse(jsonStr);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (parseError: any) {
      console.error("JSON Parse Error:", parseError, "Raw text:", finalResponseText);
      throw new Error("AI returned malformed data: " + parseError.message);
    }

    const newNichesRaw = object.niches || [];
    if (newNichesRaw.length > 0) {
      // 4. Save new niches to DB
      const dbResult = await addNiches(newNichesRaw as SuggestedNiche[]);
      if (dbResult.success) {
        const finalResult = await getActiveNiches();
        let combined = finalResult.data || [];
        if (combined.length === 0) {
           combined = newNichesRaw;
        }
        return { success: true, niches: combined.slice(0, 10) };
      } else {
        return { success: false, error: 'Failed to add niches to DB: ' + dbResult.error };
      }
    }

    return { success: true, niches: activeNiches };
  } catch (error: any) {
    console.error("Error analyzing niches:", error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function analyzeCustomProduct(userInput: string): Promise<{ success: boolean; niche?: SuggestedNiche; error?: string }> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'مفتاح OPENROUTER_API_KEY مفقود في إعدادات Vercel. يرجى إضافته.' };
    }

    const prompt = `أنت خبير تسويق بالعمولة (Affiliate Marketing Expert) لشركة رائدة.
المستخدم قام بإعطائك رابط تسويق أو وصف لمنتج معين ويريد أن تضع خطة تسويقية لاستهداف فئة معينة.

إدخال المستخدم:
"${userInput}"

مهمتك:
استنتج الفئة المستهدفة المثالية لهذا المنتج من خلال الإدخال، وقم بتكوين مجال (Niche) مخصص لها.
يجب أن ترجع النتيجة بصيغة JSON فقط، تحتوي على كائن niche بهذه الخصائص:
1. title: اسم المجال (مثل: شركات التكييف، أطباء الأسنان، محلات السوبرماركت)
2. searchQuery: كلمة البحث لاستخدامها في Google Maps (مثل: "عيادات أسنان في الرياض")
3. justification: مبرر اختيار هذه الفئة (سطر واحد)
4. expectedCommission: اكتب "مخصص من الرابط"
5. painPoint: نقطة الألم الحالية التي يحلها هذا المنتج لهذه الفئة (سطر واحد)

تأكد من إرجاع كائن JSON الصحيح والمناسب فقط.`;

    const { chatWithTeamMember } = await import('@/app/actions/team');
    
    const chatRes = await chatWithTeamMember('analyst', prompt);
    if (!chatRes.success) {
      throw new Error(chatRes.error || "Server Error from Analyst");
    }

    const finalResponseText = chatRes.response || '';
    
    let object: any = { niche: {} };
    try {
      const startIdx = finalResponseText.indexOf('{');
      const endIdx = finalResponseText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = finalResponseText.substring(startIdx, endIdx + 1);
        object = JSON.parse(jsonStr);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (parseError: any) {
      throw new Error("AI returned malformed data.");
    }

    const nicheRaw = object.niche || object;
    
    if (nicheRaw && nicheRaw.title && nicheRaw.searchQuery) {
      const newNiche: SuggestedNiche = {
        title: nicheRaw.title,
        searchQuery: nicheRaw.searchQuery,
        justification: nicheRaw.justification || 'توصية مخصصة',
        expectedCommission: nicheRaw.expectedCommission || 'مخصص من الرابط',
        painPoint: nicheRaw.painPoint || 'حل متكامل',
        status: 'ACTIVE'
      };

      const dbResult = await addNiches([newNiche]);
      if (!dbResult.success) {
        return { success: false, error: 'Failed to add custom niche to DB' };
      }
      return { success: true, niche: newNiche };
    }

    return { success: false, error: 'الذكاء الاصطناعي لم يتمكن من تكوين مجال صحيح.' };
  } catch (error: any) {
    console.error("Error analyzing custom product:", error);
    return { success: false, error: error.message || String(error) };
  }
}
