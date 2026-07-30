import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { email, requestText } = await req.json();

    if (!email || !requestText) {
      return NextResponse.json({ error: 'البريد الإلكتروني ونص الطلب مطلوبان' }, { status: 400 });
    }

    // Call OpenRouter API to draft the response
    const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // or any default model you prefer
        messages: [
          {
            role: 'system',
            content: `أنت خبير تسويق محترف. طلب العميل هو: "${requestText}". 
قم بصياغة "مسودة رد تسويقية" مقنعة جداً تجيب على العميل وترشح له منتجاً. 
هام جداً: يجب أن تترك فراغاً واضحاً بالنص التالي [INSERT_AFFILIATE_LINK_HERE] في المكان المناسب الذي يجب أن يوضع فيه رابط الإحالة.`
          }
        ]
      })
    });

    if (!openrouterRes.ok) {
      throw new Error('فشل الاتصال بـ OpenRouter');
    }

    const aiData = await openrouterRes.json();
    const aiDraftResponse = aiData.choices?.[0]?.message?.content || '';

    // Save to Firestore
    await addDoc(collection(db, 'requests'), {
      customerEmail: email,
      customerRequest: requestText,
      aiDraftResponse: aiDraftResponse,
      status: 'PENDING_AFFILIATE',
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ message: 'تم استلام الطلب وهو قيد المراجعة بنجاح', success: true });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي في الخادم', details: error.message }, { status: 500 });
  }
}
