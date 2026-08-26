import { NextResponse } from 'next/server';
import { sendTestEmail } from '@/app/actions/sendEmail';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const testContent = `مرحباً بك! 👋
هذه رسالة تجريبية من نظام Mango AI الخاص بك.
إذا وصلتك هذه الرسالة، فهذا يعني أن ربط الدومين (info@mangosai.co) يعمل بنجاح تام، وأنك جاهز لإطلاق حملاتك التسويقية الحقيقية للعملاء! 🚀

مع تحيات،
الطيار الآلي`;

    const res = await sendTestEmail(testContent, email);
    
    if (!res.success) {
      throw new Error(res.error || 'فشل الإرسال');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
