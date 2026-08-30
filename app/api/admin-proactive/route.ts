import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: null });
    }

    // 1. Gather health checks
    let pendingAffiliate = 0;
    let errorCampaigns = 0;
    let unreadInbox = 0;

    try {
      const pendingSnap = await getDocs(query(collection(db, 'requests'), where('status', '==', 'PENDING_AFFILIATE')));
      pendingAffiliate = pendingSnap.size;

      const errorSnap = await getDocs(query(collection(db, 'mass_campaigns'), where('status', '==', 'ERROR')));
      errorCampaigns = errorSnap.size;

      const inboxSnap = await getDocs(query(collection(db, 'contact_messages'), where('status', 'in', ['NEW', 'DRAFT'])));
      unreadInbox = inboxSnap.size;
    } catch (e) {
      console.error("Proactive route db error:", e);
    }

    // If nothing requires attention, return null so the AI stays quiet
    if (pendingAffiliate === 0 && errorCampaigns === 0 && unreadInbox === 0) {
      return NextResponse.json({ message: null });
    }

    // 2. Ask AI to generate a proactive alert message
    const systemPrompt = `أنت المساعد الإداري الذكي (System Admin) لنظام Mango AI.
أنت تبادر بالتحدث للمدير لتنبيهه عن حالة النظام الحالية.
المشكلات الحالية التي اكتشفتها:
${pendingAffiliate > 0 ? `- هناك ${pendingAffiliate} طلبات من عملاء تنتظر إضافة روابط العمولة (إجراء عاجل).` : ''}
${errorCampaigns > 0 ? `- هناك ${errorCampaigns} حملات تسويقية جماعية توقفت بسبب أخطاء.` : ''}
${unreadInbox > 0 ? `- هناك ${unreadInbox} رسائل جديدة في صندوق الوارد لم يتم الرد عليها.` : ''}

اكتب رسالة قصيرة جداً (سطرين كحد أقصى) تخبر فيها المدير بهذه الأمور وتطلب منه الإذن للتدخل أو تسأله عن توجيهاته.
استخدم لغة احترافية، محترمة، وضع إيموجي مناسب. لا تذكر أنك ذكاء اصطناعي، تصرف كمساعده الشخصي المخلص.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mangosai.co',
        'X-Title': 'Mango AI'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }]
      })
    });

    if (!response.ok) {
      return NextResponse.json({ message: null });
    }

    const data = await response.json();
    const alertMessage = data?.choices?.[0]?.message?.content;

    return NextResponse.json({ message: alertMessage || null });

  } catch (error) {
    console.error('Proactive API Error:', error);
    return NextResponse.json({ message: null }, { status: 500 });
  }
}
