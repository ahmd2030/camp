import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

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
صلاحياتك الحالية:
1. مناقشة الاستراتيجيات وتلقي أي تعليمات أو قواعد جديدة. إذا طلب منك المدير حفظ معلومة أو تعليمات لقسم معين، يجب عليك استخدام أداة "save_knowledge".
2. تحليل البيانات واستخراج التقارير. إذا سألك المدير عن أداء المبيعات، الإحصائيات، عدد العملاء، أو طلب تقريراً عن النظام، يجب عليك استخدام أداة "fetch_system_report" لجلب البيانات الحقيقية من قاعدة البيانات وعرضها بشكل منسق ومقنع.

أجب دائماً باحترافية، احترام، وباللغة العربية. أكد للمدير دائماً عندما تقوم بتنفيذ أي أداة.`;

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
      },
      {
        type: 'function',
        function: {
          name: 'fetch_system_report',
          description: 'جلب تقرير وإحصائيات حقيقية من قاعدة البيانات (عدد المراسلات، العملاء، الرسائل، الاجتماعات) لعرضها للمدير.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
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

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'save_knowledge',
            content: `تم حفظ القاعدة بنجاح في قسم ${args.category}. أخبر المدير بذلك.`
          });
          
          continue; // loop again to let AI respond
        }

        if (toolCall.function.name === 'fetch_system_report') {
          console.log('Fetching system report for Admin Chat...');
          let reportData = {
            totalSentLeads: 0,
            totalOpened: 0,
            totalMeetings: 0,
            pendingAffiliateRequests: 0,
            unreadInboxMessages: 0
          };

          try {
            // Sent Leads
            const leadsSnap = await getDocs(collection(db, 'sent_leads'));
            reportData.totalSentLeads = leadsSnap.size;
            leadsSnap.forEach(doc => {
              if (doc.data().opened) reportData.totalOpened++;
            });

            // Meetings
            const meetingsSnap = await getDocs(query(collection(db, 'meetings'), where('status', '==', 'scheduled')));
            reportData.totalMeetings = meetingsSnap.size;

            // Pending Requests
            const requestsSnap = await getDocs(query(collection(db, 'requests'), where('status', '==', 'PENDING_AFFILIATE')));
            reportData.pendingAffiliateRequests = requestsSnap.size;

            // Unread Inbox
            const inboxSnap = await getDocs(query(collection(db, 'contact_messages'), where('status', 'in', ['NEW', 'DRAFT'])));
            reportData.unreadInboxMessages = inboxSnap.size;

          } catch (dbErr) {
            console.error('Failed to fetch report metrics', dbErr);
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'fetch_system_report',
            content: `هذه هي إحصائيات النظام الحالية:\n${JSON.stringify(reportData, null, 2)}\n\nقم بصياغة تقرير إداري ملخص بناءً على هذه الأرقام للمدير.`
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
