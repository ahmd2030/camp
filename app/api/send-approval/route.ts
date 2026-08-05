import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { executeEmailAction } from '@/app/actions/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, customerEmail, finalEmailContent, affiliateLink } = body;

    if (!id || !customerEmail || !finalEmailContent) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    // Link Wrapping (Track Clicks)
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Replace hrefs in the email with our tracking URL
    let trackedEmailContent = finalEmailContent.replace(
      /href=["'](https?:\/\/[^"']+)["']/gi,
      (match: string, url: string) => {
        const encodedUrl = encodeURIComponent(url);
        return `href="${APP_URL}/api/track?action=click&lead_id=${id}&url=${encodedUrl}"`;
      }
    );

    // Inject Tracking Pixel (Track Opens)
    const trackingPixel = `<img src="${APP_URL}/api/track?action=open&lead_id=${id}" width="1" height="1" style="display:none;" alt="" />`;
    
    const emailHtml = `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
        ${trackedEmailContent.replace(/\n/g, '<br>')}
        ${trackingPixel}
      </div>`;

    // إرسال الإيميل للعميل فعلياً عبر Resend
    const emailResult = await executeEmailAction(
      customerEmail,
      'رد على استفسارك',
      emailHtml
    );

    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }

    await updateDoc(doc(db, 'requests', id), {
      status: 'COMPLETED',
      finalResponse: finalEmailContent,
      affiliateLink: affiliateLink || null,
      sentAt: new Date()
    });

    // Auto-save to Vault if affiliate link exists
    if (affiliateLink) {
      const { collection, addDoc, Timestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'vault'), {
        productName: body.productName || 'منتج غير محدد',
        platformName: body.platformName || 'منصة غير محددة',
        affiliateLink: affiliateLink,
        addedAt: Timestamp.now()
      });
    }

    return NextResponse.json({ message: 'تم إرسال الإيميل واعتماد الطلب بنجاح', success: true });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الإرسال', details: error.message }, { status: 500 });
  }
}
