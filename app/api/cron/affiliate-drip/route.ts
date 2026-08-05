import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { executeEmailAction } from '@/app/actions/email';

export async function GET(req: Request) {
  try {
    // 1. Fetch eligible requests
    // Using simple query to avoid needing complex Firestore composite indexes immediately
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'COMPLETED'),
      where('opened', '==', true),
      where('clicked', '==', false)
    );

    const snapshot = await getDocs(q);
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    
    let processedCount = 0;
    const errors: string[] = [];

    // Extract leads that need follow-up
    const leadsToProcess: any[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      
      // Check if already followed up
      if (data.followUpSent) return;

      // Check time passed
      let sentTime = 0;
      if (data.sentAt?.toMillis) {
        sentTime = data.sentAt.toMillis();
      } else if (data.sentAt instanceof Date) {
        sentTime = data.sentAt.getTime();
      }

      if (sentTime > 0 && (now - sentTime) >= THREE_DAYS) {
        leadsToProcess.push({ id: docSnap.id, ...data });
      }
    });

    // 2. Process each lead
    for (const lead of leadsToProcess) {
      try {
        const affiliateLink = lead.affiliateLink || lead.affiliateSignupUrl || '';
        
        // Skip if no link is found (shouldn't happen with the new saving mechanism, but just in case)
        if (!affiliateLink) {
          throw new Error('No affiliate link found for this lead');
        }

        // Generate AI Follow-up Message
        const prompt = `أنت موظف تطوير أعمال خبير في شركة Mango AI.
العميل (${lead.customerName || 'العميل'}) قرأ إيميلنا السابق بخصوص (${lead.productName || 'الخدمة'}) ولكنه لم يقم بالتسجيل بعد.

قم بصياغة رسالة متابعة قصيرة جداً (سطرين كحد أقصى) وبأسلوب ودي واحترافي.
مثال: "مرحباً، أردت فقط التأكد من وصول رسالتي السابقة بخصوص... هل سنحت لك الفرصة للإطلاع عليها؟ يمكنك البدء من هنا: [AFFILIATE_LINK]"

القواعد الصارمة:
1. الرسالة قصيرة جداً ومباشرة.
2. لا تستخدم أسلوب الروبوتات، اجعلها تبدو مكتوبة بشرياً بالكامل.
3. يجب أن تضع النص [AFFILIATE_LINK] بالضبط كما هو في المكان المخصص لرابط التسجيل.
4. لا تضف أي نصوص أو تعليقات خارجية.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        let followUpMessage = data.choices?.[0]?.message?.content || '';

        if (!followUpMessage) throw new Error("لم يتم توليد رسالة المتابعة بشكل صحيح");

        // Insert the actual link
        followUpMessage = followUpMessage.replace(/\[AFFILIATE_LINK\]/gi, affiliateLink);

        // 3. Link Wrapping & Tracking Pixel
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Wrap link
        let trackedEmailContent = followUpMessage.replace(
          /href=["'](https?:\/\/[^"']+)["']/gi,
          (match: string, url: string) => {
            const encodedUrl = encodeURIComponent(url);
            return `href="${APP_URL}/api/track?action=click&lead_id=${lead.id}&url=${encodedUrl}"`;
          }
        );

        // If AI generated raw link instead of href, wrap it as well
        trackedEmailContent = trackedEmailContent.replace(
          /(?<!href=["'])(https?:\/\/[^\s]+)/gi,
          (match: string, url: string) => {
            const encodedUrl = encodeURIComponent(url);
            return `<a href="${APP_URL}/api/track?action=click&lead_id=${lead.id}&url=${encodedUrl}">${url}</a>`;
          }
        );

        const trackingPixel = `<img src="${APP_URL}/api/track?action=open&lead_id=${lead.id}" width="1" height="1" style="display:none;" alt="" />`;
        
        const emailHtml = `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
            ${trackedEmailContent.replace(/\n/g, '<br>')}
            ${trackingPixel}
          </div>`;

        // 4. Send Email
        const emailResult = await executeEmailAction(
          lead.customerEmail,
          'متابعة بخصوص استفساركم السابق',
          emailHtml
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error);
        }

        // 5. Update Database
        await updateDoc(doc(db, 'requests', lead.id), {
          followUpSent: true,
          followUpSentAt: Timestamp.now(),
          followUpMessage: followUpMessage
        });

        processedCount++;

      } catch (e: any) {
        console.error(`Error processing lead ${lead.id}:`, e);
        errors.push(`Lead ${lead.id}: ${e.message}`);
      }

      // Small delay between sending
      await new Promise(r => setTimeout(r, 2000));
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم إرسال ${processedCount} رسائل متابعة بنجاح`
    });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في محرك المتابعة', details: error.message }, { status: 500 });
  }
}
