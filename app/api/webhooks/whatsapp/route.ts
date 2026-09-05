import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, limit, orderBy } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { phone, name, text } = await req.json();

    if (!phone || !text) {
      return NextResponse.json({ error: 'Missing phone or text' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: 'عذراً، نظام الذكاء الاصطناعي غير متصل حالياً.' });
    }

    // 1. Save the incoming message to Firestore (whatsapp_conversations)
    // We will save each message as a document for simplicity, or append to a conversation doc.
    try {
      await addDoc(collection(db, 'whatsapp_messages'), {
        phone: phone,
        customerName: name,
        text: text,
        sender: 'customer',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error saving whatsapp msg to DB:', e);
    }

    // 2. Fetch Company Knowledge
    let rulesText = '';
    try {
      const rulesSnap = await getDocs(collection(db, 'company_knowledge'));
      rulesSnap.forEach(doc => {
        const d = doc.data();
        rulesText += `- **${d.question || d.category || 'قاعدة'}**: ${d.answer || d.rule}\n`;
      });
    } catch (dbErr) {
      console.error('Failed to load rules', dbErr);
    }

    // 3. Fetch last 5 messages of this conversation for context
    let historyContext = '';
    try {
      const histQ = query(
        collection(db, 'whatsapp_messages'), 
        where('phone', '==', phone), 
        // Order by requires composite index usually, let's just get them and sort in memory if needed, or assume recent ones.
        // For now, let's keep it simple without complex queries to avoid missing index errors.
      );
      const histSnap = await getDocs(histQ);
      // Sort in memory by time (if they have createdAt)
      const msgs = histSnap.docs
        .map(d => d.data())
        .filter(d => d.createdAt)
        .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
        .slice(-5); // get last 5

      msgs.forEach(m => {
        historyContext += `${m.sender === 'customer' ? name : 'أنت'}: ${m.text}\n`;
      });
    } catch (e) {
      console.error('Error fetching history:', e);
    }

    // 4. Construct Prompt
    const systemPrompt = `أنت موظف مبيعات وتسويق محترف تعمل لصالح شركتنا.
مهمتك هي الرد على رسائل العملاء عبر الواتساب، إقناعهم، الإجابة على استفساراتهم، وبيع منتجاتنا/خدماتنا بأسلوب لبق، ذكي، وغير آلي (تحدث كإنسان حقيقي محترف).

معلومات العميل الحالي:
الاسم: ${name}
رقم الواتساب: ${phone}

${rulesText ? `\nقواعد ومعلومات الشركة التي يجب أن تلتزم بها:\n${rulesText}` : ''}

${historyContext ? `\nسجل المحادثة الأخير مع هذا العميل:\n${historyContext}` : ''}

رسالة العميل الحالية: "${text}"

اكتب ردك مباشرة للعميل. لا تكتب أي مقدمات أو ملاحظات خارجية. استخدم الإيموجي باعتدال وتحدث بلهجة طبيعية.`;

    // 5. Call AI
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
      const err = await response.text();
      console.error('AI Error:', err);
      return NextResponse.json({ reply: 'عذراً، أواجه ضغطاً حالياً. سأعود للرد عليك قريباً.' });
    }

    const data = await response.json();
    const replyText = data?.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من صياغة رد.';

    // 6. Save the AI's reply to Firestore
    try {
      await addDoc(collection(db, 'whatsapp_messages'), {
        phone: phone,
        customerName: name,
        text: replyText,
        sender: 'ai',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error saving AI msg to DB:', e);
    }

    // 7. Return reply to WhatsApp bot
    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
