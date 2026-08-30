import { NextResponse } from 'next/server';
import { executeEmailAction } from '@/app/actions/email';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';
import * as cheerio from 'cheerio';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

// Fetch all company knowledge from Firestore
async function getCompanyKnowledge(): Promise<string> {
  try {
    const snap = await getDocs(collection(db, 'company_knowledge'));
    if (snap.empty) return '';
    const entries: string[] = [];
    snap.forEach(doc => {
      const d = doc.data();
      entries.push(`س: ${d.question}\nج: ${d.answer}`);
    });
    return entries.join('\n\n---\n\n');
  } catch (e) {
    console.error('Failed to fetch company knowledge:', e);
    return '';
  }
}

// Fetch all affiliate links from Firestore
async function getAffiliateLinksText(): Promise<string> {
  try {
    const snap = await getDocs(collection(db, 'links_bank'));
    if (snap.empty) return '';
    const entries: string[] = [];
    snap.forEach(doc => {
      const d = doc.data();
      entries.push(`- المنصة/الخدمة: ${d.productName}\n  المجال: ${d.niche}\n  رابط الأفلييت للتسجيل: ${d.affiliateLink}`);
    });
    return entries.join('\n\n');
  } catch (e) {
    console.error('Failed to fetch affiliate links:', e);
    return '';
  }
}

async function performSearch(queryStr: string): Promise<string> {
  try {
    const searchRes = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(queryStr), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    const htmlText = await searchRes.text();
    const $ = cheerio.load(htmlText);
    
    let resultsText = '';
    $('.result').slice(0, 5).each((i, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && snippet) {
        resultsText += `العنوان: ${title}\nالملخص: ${snippet}\n\n`;
      }
    });
    return resultsText || 'لم يتم العثور على نتائج للبحث.';
  } catch (e) {
    return 'حدث خطأ أثناء البحث.';
  }
}

// Generate AI reply using company knowledge, affiliate links, and OpenRouter
async function generateAutoReply(customerEmail: string, messageText: string): Promise<{ text: string | null; suggestedTime: string | null; delayHours: number; hasKnowledge: boolean }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('No OPENROUTER_API_KEY found in environment');
    return { text: null, suggestedTime: null, delayHours: 0, hasKnowledge: false };
  }

  const knowledgeBase = await getCompanyKnowledge();
  const affiliateLinks = await getAffiliateLinksText();
  const hasKnowledge = knowledgeBase.length > 50 || affiliateLinks.length > 10;

  let systemPrompt = `أنت وسيط مبيعات خبير (Broker) ومستشار في شركة Mango AI.
مهمتك الأساسية هي فهم احتياجات العميل، ثم اقتراح الخدمة أو المنصة الأنسب له من قائمة عروض الأفلييت المتاحة لدينا، وإقناعه بها بناءً على شروط وعروض تلك المنصة الحقيقية.

تعليمات صارمة:
1. ادرس رسالة العميل بعناية وافهم مجال عمله واحتياجه الفعلي. لا تتحدث بشكل عام أبداً.
2. لدينا خدمة حصرية تسمى "كاشف العملاء" (Client Detector): وظيفتها جلب 100 عميل محتمل للعميل (حسب تخصصه ومنطقته الجغرافية) مع إيميلاتهم وأرقام هواتفهم، وتكلفتها 29.99 دولار فقط. يمكنك اقتراحها وإقناع العميل بها بقوة إذا كان يبحث عن زيادة عملائه ومبيعاته. 
مهم جداً بشأن هذه الخدمة: لا تطلب الدفع ولا ترسل أي روابط دفع. إذا وافق العميل أو أبدى اهتماماً بشراء هذه الخدمة، اطلب منه تزويدنا برقم هاتفه (واتساب) لكي يتواصل معه فريقنا مباشرة لإتمام العملية وتأكيد طلبه.
3. استخدم أداة البحث (search_internet) للبحث عن شروط المنصات (في قائمة الأفلييت) وعروضها الحالية لتتمكن من إقناع العميل بفوائدها بشكل دقيق. 
4. الرد يجب أن يكون مقنعاً، مهنياً، مخصصاً لحالة العميل تماماً، وباللغة العربية الفصحى. يجب وضع رابط الأفلييت الخاص بنا في الرسالة.
5. اختم رسالتك بـ "مع التحية، فريق Mango AI".
6. إذا أردت استخدام البحث، استدع أداة search_internet وسيعود لك النظام بالنتائج.
7. عندما تنتهي من البحث وتصبح جاهزاً للرد النهائي، يجب أن تُرجع النتيجة بصيغة JSON فقط بهذا الشكل:
{
  "replyText": "نص الرد الجاهز للإرسال للعميل متضمناً الإقناع والروابط المطلوبة",
  "suggestedTime": "رسالة لك توضح متى سيتم الإرسال (مثال: 💡 سيتم إرسال الرد تلقائياً غداً الساعة 9 صباحاً بتوقيت العميل)",
  "delayHours": 14
}
(ضع في delayHours عدد الساعات التي يجب أن ينتظرها النظام قبل الإرسال. ضع 0 إذا كان الوقت الحالي مناسباً للإرسال فوراً).

[برامج وعروض الأفلييت المتاحة لدينا]:
${affiliateLinks}

[قاعدة معرفة الشركة (إن وجدت)]:
${knowledgeBase}
`;

  if (!hasKnowledge) {
    systemPrompt += '\n\n[تنبيه]: لا توجد معلومات في قاعدة المعرفة أو برامج الأفلييت بعد. أجب بشكل احترافي بناءً على المعطيات واطلب من العميل الانتظار.';
  }

  let messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `رسالة من عميل (${customerEmail}):\n"""\n${messageText}\n"""` }
  ];

  try {
    const tools = [
      {
        type: "function",
        function: {
          name: "search_internet",
          description: "البحث في الإنترنت الحقيقي عن معلومات وشروط وعروض المنصات",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "مصطلح البحث" }
            },
            required: ["query"]
          }
        }
      }
    ];

    let maxLoops = 2;
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
          messages: messages,
          tools: tools,
          tool_choice: "auto"
        })
      });

      if (!response.ok) {
        console.error('OpenRouter Error:', await response.text());
        return { text: null, suggestedTime: null, delayHours: 0, hasKnowledge };
      }

      const data = await response.json();
      const responseMessage = data?.choices?.[0]?.message;
      
      if (!responseMessage) break;

      messages.push(responseMessage);

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        if (toolCall.function.name === 'search_internet') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('Webhook AI Searching for:', args.query);
          const searchResults = await performSearch(args.query);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'search_internet',
            content: `نتائج البحث:\n${searchResults}\n\nالآن اكتب الرد النهائي بصيغة JSON فقط بناءً على ما وجدته.`
          });
          continue; // Loop again to get the final response
        }
      }

      // If we reach here, we have the final text response (hopefully JSON)
      const rawContent = responseMessage.content || '';
      try {
        const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(cleanJson);
        return { 
          text: parsed.replyText || null, 
          suggestedTime: parsed.suggestedTime || null,
          delayHours: parsed.delayHours || 0,
          hasKnowledge 
        };
      } catch (parseErr) {
        console.error('Failed to parse AI JSON:', parseErr, rawContent);
        return { text: rawContent, suggestedTime: null, delayHours: 0, hasKnowledge };
      }
    }
    return { text: null, suggestedTime: null, delayHours: 0, hasKnowledge };
  } catch (err) {
    console.error('generateAutoReply Error:', err);
    return { text: null, suggestedTime: null, delayHours: 0, hasKnowledge };
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Resend webhook payload
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true, message: 'Ignored non-received event' });
    }
    
    const emailData = payload.data || payload; 
    let sender = emailData.from;
    
    // Extract raw email if it comes in "Name <email>" format
    if (sender && sender.includes('<')) {
      const match = sender.match(/<([^>]+)>/);
      if (match) sender = match[1];
    }
    sender = sender?.toLowerCase().trim();

    let actualText = emailData.text || '';
    let actualHtml = emailData.html || '';

    // If Resend didn't include the body in the webhook payload, fetch it using the email_id
    if (!actualText && !actualHtml && emailData.email_id) {
      try {
        const fetchedEmail = await resend.emails.get(emailData.email_id);
        if (fetchedEmail && fetchedEmail.data) {
          actualText = (fetchedEmail.data as any).text || '';
          actualHtml = (fetchedEmail.data as any).html || '';
        }
      } catch (err) {
        console.error('Failed to fetch full email body from Resend API:', err);
      }
    }

    let textBody = actualText || actualHtml || emailData.subject || 'Empty message';

    // Clean up Gmail quoted replies (cut off the "On ... wrote:" part)
    if (actualText && actualText.includes('On ') && actualText.includes('wrote:')) {
      const replyParts = actualText.split(/On .* wrote:/);
      if (replyParts.length > 0 && replyParts[0].trim().length > 0) {
        textBody = replyParts[0].trim();
      }
    }

    // DEBUG: Save raw payload to Firestore
    try {
      await addDoc(collection(db, 'webhook_logs'), {
        createdAt: new Date(),
        payload: payload,
        extractedTextBody: textBody,
        sender: sender
      });
    } catch (e) {
      console.error('Failed to log webhook', e);
    }

    if (!sender || !textBody) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Mark lead as replied in Firestore to stop drip campaigns
    try {
      const q = query(collection(db, 'sent_leads'), where('email', '==', sender));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          hasReplied: true,
          lastReplyAt: new Date()
        });
      });
    } catch (dbError) {
      console.error('Error updating Firestore for reply:', dbError);
    }

    // 1.5 Save incoming message to Inbox (contact_messages)
    let inboxDocRef: any = null;
    try {
      inboxDocRef = await addDoc(collection(db, 'contact_messages'), {
        email: sender,
        customerName: emailData.from || sender,
        message: textBody,
        status: 'NEW',
        source: 'email_reply',
        createdAt: new Date()
      });
    } catch (inboxError) {
      console.error('Error saving to inbox:', inboxError);
    }

    // 2. Generate AI reply using company knowledge
    const aiResult = await generateAutoReply(sender, textBody);

    // Save as draft for owner review with time recommendation, or schedule it if knowledge exists
    if (inboxDocRef) {
      try {
        let scheduledAt = null;
        if (aiResult.hasKnowledge && aiResult.delayHours >= 0) {
           scheduledAt = new Date(Date.now() + aiResult.delayHours * 60 * 60 * 1000);
        }

        await updateDoc(inboxDocRef, {
          aiDraft: aiResult.text || null,
          suggestedTime: aiResult.suggestedTime || null,
          scheduledAt: scheduledAt,
          status: aiResult.text ? (scheduledAt ? 'SCHEDULED' : 'DRAFT') : 'AI_FAILED',
          subject: emailData.subject || null,
          hasKnowledge: aiResult.hasKnowledge
        });
      } catch (e) {
        console.error('Failed to update inbox doc with draft/scheduled', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Draft saved with time recommendation',
      hasKnowledge: aiResult.hasKnowledge
    });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
