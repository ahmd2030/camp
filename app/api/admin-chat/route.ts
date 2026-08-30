import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

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

    // Fetch existing knowledge so the AI has context of what it already learned
    let existingKnowledgeText = "لا توجد قواعد سابقة.";
    try {
      const knowledgeSnap = await getDocs(collection(db, 'company_knowledge'));
      if (!knowledgeSnap.empty) {
        const knowledgeItems: string[] = [];
        knowledgeSnap.forEach(doc => {
          const data = doc.data();
          knowledgeItems.push(`- قسم [${data.category}]: ${data.question} -> ${data.answer}`);
        });
        existingKnowledgeText = knowledgeItems.join('\n');
      }
    } catch (e) {
      console.error("Failed to fetch knowledge", e);
    }

    const systemPrompt = `أنت المساعد الإداري الذكي (System Admin) لنظام Mango AI.
أنت تتحدث الآن مع مالك النظام (المدير).
أنت ذكي جداً، مبادر، ولديك ذاكرة حديدية بفضل قاعدة المعرفة التي تخزن فيها كل شيء.

هذه هي القواعد والمعلومات التي تعلمتها مسبقاً (عقل النظام الحالي):
${existingKnowledgeText}

صلاحياتك الحالية:
1. التعلم وحفظ القواعد: بادر بذكاء واستخدم أداة "save_knowledge" لحفظ أي استراتيجية، قاعدة تسعير، أو تعليمة جديدة يذكرها المدير في الحديث (حتى لو لم يطلب منك حفظها صراحة). إذا كانت المعلومة جديدة ومهمة للأقسام الأخرى، احفظها فوراً!
2. تحليل البيانات واستخراج التقارير: استخدم أداة "fetch_system_report" متى ما سأل المدير عن الإحصائيات، عدد العملاء، أو المبيعات.
3. تشغيل الطيار الآلي: استخدم أداة "run_autopilot" متى ما طلب المدير البحث عن عملاء جدد في مجال معين وإرسال عروض لهم.
4. المراسلة: استخدم أداة "send_quick_email" لإرسال بريد إلكتروني لعميل معين بناءً على طلب المدير.
5. تنظيف النظام: استخدم أداة "clean_database" لحذف الحملات القديمة والمهام المنتهية إذا طلب المدير ترتيب أو تنظيف النظام.
6. إدارة المهام المعلقة: إذا طلب منك المدير تنفيذ المهام المعلقة، استخدم أداة "get_pending_requests" لمعرفة الطلبات، ثم اطلب من المدير تزويدك بروابط العمولة لها (إن لم تكن تعرفها)، وبعدها استخدم أداة "approve_request" لإرسالها للعملاء وإنهائها.

أجب دائماً باحترافية، وكن استباقياً في اقتراح التحسينات. أكد للمدير دائماً عندما تقوم بحفظ أي قاعدة جديدة في عقلك.`;

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
      },
      {
        type: 'function',
        function: {
          name: 'run_autopilot',
          description: 'تشغيل الطيار الآلي للبحث عن عملاء جدد وإرسال عروض لهم. يتطلب تحديد مجال البحث وعدد العملاء.',
          parameters: {
            type: 'object',
            properties: {
              searchQuery: { type: 'string', description: 'مجال البحث (مثال: عيادات تجميل في الرياض)' },
              targetCount: { type: 'number', description: 'عدد العملاء المطلوب استهدافهم (مثال: 10, 50, 100)' },
              customProduct: { type: 'string', description: 'اختياري: وصف أو رابط المنتج المراد تسويقه' }
            },
            required: ['searchQuery', 'targetCount']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'send_quick_email',
          description: 'إرسال بريد إلكتروني سريع لعميل معين (مثلاً لتقديم عرض خاص أو الرد على استفسار).',
          parameters: {
            type: 'object',
            properties: {
              toEmail: { type: 'string', description: 'البريد الإلكتروني للعميل' },
              subject: { type: 'string', description: 'عنوان الإيميل' },
              message: { type: 'string', description: 'نص الإيميل (يفضل أن يكون منسقاً HTML إن أمكن أو نص عادي واضح)' }
            },
            required: ['toEmail', 'subject', 'message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'clean_database',
          description: 'تنظيف قاعدة البيانات من المهام المكتملة والحملات السابقة لتخفيف الضغط على النظام.',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'ما الذي يجب تنظيفه؟ (mass_campaigns, contact_messages, or all)' }
            },
            required: ['target']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_pending_requests',
          description: 'جلب قائمة بالطلبات المعلقة التي تنتظر الموافقة ورابط العمولة.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'approve_request',
          description: 'الموافقة على طلب معلق وإرسال الإيميل النهائي للعميل مع رابط العمولة.',
          parameters: {
            type: 'object',
            properties: {
              requestId: { type: 'string', description: 'معرف الطلب (ID)' },
              affiliateLink: { type: 'string', description: 'رابط الإحالة/العمولة الذي سيتم إرساله للعميل' }
            },
            required: ['requestId', 'affiliateLink']
          }
        }
      }
    ];

    let maxLoops = 4; // increased to allow multi-tool sequences
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

        if (toolCall.function.name === 'run_autopilot') {
          const args = JSON.parse(toolCall.function.arguments);
          let replyContent = '';
          
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000');
            const res = await fetch(`${appUrl}/api/mass-campaign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                searchQuery: args.searchQuery,
                targetCount: args.targetCount,
                customProduct: args.customProduct || null
              })
            });
            
            const data = await res.json();
            if (res.ok) {
              replyContent = `تم تشغيل الطيار الآلي بنجاح! معرّف الحملة: ${data.campaignId}. أخبر المدير أن الصاروخ انطلق وسيبدأ بالبحث عن ${args.targetCount} عميل في مجال ${args.searchQuery}.`;
            } else {
              replyContent = `حدث خطأ أثناء تشغيل الطيار الآلي: ${data.error}`;
            }
          } catch (e: any) {
            replyContent = `تعذر الاتصال بخادم الطيار الآلي: ${e.message}`;
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'run_autopilot',
            content: replyContent
          });
          
          continue;
        }

        if (toolCall.function.name === 'send_quick_email') {
          const args = JSON.parse(toolCall.function.arguments);
          let replyContent = '';
          
          try {
            // dynamic import to avoid module issues if needed, or import at top. Let's dynamic import.
            const { sendTestEmail } = await import('@/app/actions/sendEmail');
            const res = await sendTestEmail(args.message, args.toEmail, undefined, args.subject);
            
            if (res.success) {
              replyContent = `تم إرسال الإيميل بنجاح إلى ${args.toEmail} بعنوان "${args.subject}".`;
            } else {
              replyContent = `حدث خطأ أثناء إرسال الإيميل: ${res.error}`;
            }
          } catch (e: any) {
            replyContent = `تعذر إرسال الإيميل: ${e.message}`;
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'send_quick_email',
            content: replyContent
          });
          
          continue;
        }

        if (toolCall.function.name === 'clean_database') {
          const args = JSON.parse(toolCall.function.arguments);
          let replyContent = '';
          
          try {
            let deletedCount = 0;
            if (args.target === 'mass_campaigns' || args.target === 'all') {
              const campaigns = await getDocs(query(collection(db, 'mass_campaigns'), where('status', 'in', ['COMPLETED', 'ERROR'])));
              for (const document of campaigns.docs) {
                await deleteDoc(doc(db, 'mass_campaigns', document.id));
                deletedCount++;
              }
            }
            
            replyContent = `تم تنظيف قاعدة البيانات بنجاح. تم حذف ${deletedCount} سجل من المهام المنتهية/الفاشلة.`;
          } catch (e: any) {
            replyContent = `تعذر تنظيف قاعدة البيانات: ${e.message}`;
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'clean_database',
            content: replyContent
          });
          
          continue;
        }

        if (toolCall.function.name === 'get_pending_requests') {
          let replyContent = '';
          try {
            const requestsSnap = await getDocs(query(collection(db, 'requests'), where('status', '==', 'PENDING_AFFILIATE')));
            if (requestsSnap.empty) {
              replyContent = 'لا توجد أي طلبات معلقة حالياً.';
            } else {
              const pendingList: any[] = [];
              requestsSnap.forEach(doc => {
                const data = doc.data();
                pendingList.push({
                  id: doc.id,
                  customerEmail: data.customerEmail,
                  platform: data.platform || data.productName || 'غير محدد'
                });
              });
              replyContent = `هناك ${pendingList.length} طلبات معلقة:\n${JSON.stringify(pendingList, null, 2)}\n\nاسأل المدير عن روابط الإحالة لهذه المنصات لتتمكن من الموافقة عليها (إلا إذا كنت تحفظ الروابط مسبقاً في عقلك).`;
            }
          } catch (e: any) {
            replyContent = `حدث خطأ أثناء جلب الطلبات: ${e.message}`;
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'get_pending_requests',
            content: replyContent
          });
          continue;
        }

        if (toolCall.function.name === 'approve_request') {
          const args = JSON.parse(toolCall.function.arguments);
          let replyContent = '';
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000');
            // Fetch the specific request to get email body
            // Need to import getDoc from firestore
            const { getDoc, doc } = await import('firebase/firestore');
            const reqDocRef = doc(db, 'requests', args.requestId);
            const reqSnap = await getDoc(reqDocRef);
            
            if (!reqSnap.exists()) {
              replyContent = `الطلب ذو المعرف ${args.requestId} غير موجود.`;
            } else {
              const reqData = reqSnap.data();
              const finalEmailContent = reqData.aiDraftResponse.replace(/\[INSERT_AFFILIATE_LINK_HERE\]/g, args.affiliateLink);
              
              const res = await fetch(`${appUrl}/api/send-approval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: args.requestId,
                  customerEmail: reqData.customerEmail,
                  finalEmailContent: finalEmailContent,
                  affiliateLink: args.affiliateLink,
                  productName: reqData.productName || '',
                  platformName: reqData.platform || ''
                })
              });
              
              if (res.ok) {
                replyContent = `تم الموافقة على الطلب بنجاح وإرسال الإيميل للعميل ${reqData.customerEmail}.`;
              } else {
                replyContent = `فشل إرسال الموافقة: ${await res.text()}`;
              }
            }
          } catch (e: any) {
            replyContent = `حدث خطأ أثناء الموافقة: ${e.message}`;
          }

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'approve_request',
            content: replyContent
          });
          continue;
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
