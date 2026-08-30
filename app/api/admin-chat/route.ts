import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    const systemPrompt = `أنت المساعد الإداري الذكي (System Admin) لنظام Mango AI.
أنت تتحدث الآن مع مالك النظام (المدير).
مهمتك هي مناقشة الاستراتيجيات معه، وتلقي أي تعليمات أو قواعد جديدة (مثلاً لقسم المحاسبة، المبيعات، أو الدعم الفني).
إذا طلب منك المدير حفظ معلومة أو تعليمات لقسم معين، يجب عليك استخدام الأداة (Tool) المسماة "save_knowledge" لحفظ هذه القاعدة في "عقل النظام" (قاعدة المعرفة)، لكي يتعلمها النظام وتطبقها الأقسام المعنية لاحقاً.
أجب دائماً باحترافية، احترام، وباللغة العربية. أكد للمدير دائماً عندما تقوم بحفظ أي قاعدة جديدة.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'save_knowledge',
          description: 'حفظ قاعدة، تعليمة، أو معلومة جديدة في قاعدة معرفة النظام (Company Knowledge) لكي تتعلمها الأقسام الأخرى.',
          parameters: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'عنوان أو موضوع القاعدة (مثال: طريقة خصم كاشف العملاء)' },
              rule: { type: 'string', description: 'نص القاعدة أو التعليمة بالتفصيل' },
              category: { type: 'string', description: 'القسم المعني (مثال: accounting, sales, general)' }
            },
            required: ['topic', 'rule', 'category']
          }
        }
      }
    ];

    let maxLoops = 2;
    let currentMessages = [...fullMessages];

    for (let i = 0; i < maxLoops; i++) {
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
          messages: currentMessages,
          tools: tools,
          tool_choice: "auto"
        })
      });

      if (!response.ok) {
        throw new Error('OpenRouter API request failed: ' + await response.text());
      }

      const data = await response.json();
      const responseMessage = data?.choices?.[0]?.message;

      if (!responseMessage) break;
      
      currentMessages.push(responseMessage);

      // Check if tool was called
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        
        if (toolCall.function.name === 'save_knowledge') {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Save to Firestore
          try {
            await addDoc(collection(db, 'company_knowledge'), {
              question: args.topic,
              answer: args.rule,
              category: args.category,
              source: 'admin_chat',
              createdAt: serverTimestamp()
            });
            console.log('Saved to knowledge base:', args);
          } catch (dbErr) {
            console.error('Failed to save knowledge', dbErr);
          }

          // Append tool result
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'save_knowledge',
            content: `تم حفظ القاعدة بنجاح في قسم ${args.category}. أخبر المدير بذلك.`
          });
          
          continue; // loop again to let AI respond
        }
      }

      // If no tool call, or we finished processing tools, return the final response
      return NextResponse.json({ reply: responseMessage.content });
    }

    return NextResponse.json({ reply: "تمت العملية، ولكن لم يتم استلام رد نهائي من النظام." });

  } catch (error: any) {
    console.error('Admin Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
