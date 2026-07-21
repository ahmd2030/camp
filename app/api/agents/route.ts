import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "openai/gpt-4o-mini";

async function callAgent(systemPrompt: string, userPrompt: string, history: any[] = [], responseFormat?: any) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userPrompt }
  ];

  const body: any = {
    model: MODEL,
    messages: messages,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      // 1. الوكيل 1: مدير استخبارات السوق
      const intelligencePrompt = `أنت مدير استخبارات السوق. وظيفتك تحليل السوق الحالي واقتراح مجال (Niche) واحد فقط ساخن ومربح جداً للتسويق بالعمولة. 
أرجع النتيجة بصيغة JSON فقط: {"niche": "اسم المجال", "reason": "سبب الاختيار باختصار"}`;
      
      const intelligenceResponse = await callAgent(intelligencePrompt, "اقترح مجالاً ساخناً", [], { type: "json_object" });
      const intelligenceData = JSON.parse(intelligenceResponse);

      // 2. الوكيل 2: مدير الشراكات
      const partnershipsPrompt = `أنت مدير الشراكات. بناءً على المجال الذي اقترحه مدير الاستخبارات، اقترح أفضل برنامج تسويق بالعمولة (Affiliate Program) لهذا المجال.
أرجع النتيجة بصيغة JSON فقط: {"platform": "اسم المنصة", "terms": "شروط التسجيل باختصار", "signupLink": "رابط التسجيل للمسوقين"}`;
      
      const partnershipsResponse = await callAgent(partnershipsPrompt, `المجال المقترح هو: ${intelligenceData.niche}`, [], { type: "json_object" });
      const partnershipsData = JSON.parse(partnershipsResponse);

      // 3. الوكيل 3: المدير العام (GM)
      const gmPrompt = `أنت المدير العام (GM) للشركة. وظيفتك هي تقديم ملخص تنفيذي احترافي للـ CEO (المستخدم).
تحدث بلهجة احترافية ومحترمة (سيدي المدير).
المعلومات المتاحة:
- المجال المقترح: ${intelligenceData.niche} (${intelligenceData.reason})
- منصة التسويق: ${partnershipsData.platform}
- الشروط: ${partnershipsData.terms}
- رابط التسجيل: ${partnershipsData.signupLink}

اكتب رسالة تلخص هذه الخطة بأسلوب مقنع، واطلب من المدير (CEO) الذهاب للتسجيل في المنصة ووضع رابط الإحالة الخاص به في النظام لاعتماد الخطة والبدء بالصيد.
أرجع النتيجة بصيغة JSON فقط: {"message": "الرسالة التنفيذية للـ CEO", "planData": {"niche": "...", "platform": "...", "signupLink": "..."}}`;
      
      const gmResponse = await callAgent(gmPrompt, "قدم الخطة للـ CEO.", [], { type: "json_object" });
      const gmData = JSON.parse(gmResponse);

      return NextResponse.json({ 
        success: true, 
        message: gmData.message,
        planData: {
          niche: intelligenceData.niche,
          platform: partnershipsData.platform,
          signupLink: partnershipsData.signupLink
        }
      });
    } else {
      // يوجد تاريخ للمحادثة (الـ CEO يرد على المدير العام)
      const gmPrompt = `أنت المدير العام (GM) للشركة. أنت تتحدث مع الـ CEO (المستخدم) الذي طلب تعديلاً على الخطة التسويقية السابقة.
يجب عليك الرد باحترافية وتعديل الخطة بناءً على توجيهاته، واقتراح تفاصيل جديدة إذا لزم الأمر (مجال جديد، أو منصة جديدة).
دائماً اختم رسالتك بطلب الموافقة وإرفاق رابط الإحالة من الـ CEO.
أرجع النتيجة بصيغة JSON فقط: {"message": "ردك على الـ CEO", "planData": {"niche": "المجال المُحدث أو القديم", "platform": "المنصة", "signupLink": "الرابط"}}`;
      
      // نستخرج رسالة المستخدم الأخيرة
      const lastMessage = messages[messages.length - 1].content;
      // نمرر التاريخ السابق بدون آخر رسالة (إن وجد)
      const history = messages.slice(0, -1);

      const gmResponse = await callAgent(gmPrompt, lastMessage, history, { type: "json_object" });
      const gmData = JSON.parse(gmResponse);

      return NextResponse.json({ 
        success: true, 
        message: gmData.message,
        planData: gmData.planData
      });
    }

  } catch (error: any) {
    console.error("Error in agents chain:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
