import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing in Vercel' }, { status: 500 });
    }

    // الاتصال بخوادم جوجل لجلب قائمة النماذج المتاحة
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to fetch models');
    }

    // استخراج أسماء النماذج وتجهيزها كنص
    const availableModels = data.models 
      ? data.models.map((m: any) => m.name.replace('models/', '')).join(', ') 
      : 'No models found';

    // إرجاع الأسماء عمداً كخطأ 500 لكي تظهر باللون الأحمر في الواجهة الأمامية للمستخدم
    return NextResponse.json({ 
      error: `النماذج المتاحة لمفتاحك هي: ${availableModels}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error("Discovery Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
