import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { executeEmailAction } from '@/app/actions/email';

export async function POST(req: Request) {
  try {
    const { id, customerEmail, finalEmailContent } = await req.json();

    if (!id || !customerEmail || !finalEmailContent) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    // إرسال الإيميل للعميل فعلياً عبر Resend
    const emailResult = await executeEmailAction(
      customerEmail,
      'رد على استفسارك',
      `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
        ${finalEmailContent.replace(/\n/g, '<br>')}
      </div>`
    );

    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }

    // تحديث حالة الطلب في قاعدة البيانات إلى COMPLETED
    await updateDoc(doc(db, 'requests', id), {
      status: 'COMPLETED',
      finalResponse: finalEmailContent,
      sentAt: new Date()
    });

    return NextResponse.json({ message: 'تم إرسال الإيميل واعتماد الطلب بنجاح', success: true });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الإرسال', details: error.message }, { status: 500 });
  }
}
