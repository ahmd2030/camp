import { NextResponse } from 'next/server';
import { approveAction, rejectAction } from '@/services/aiActionService';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    if (status === 'approved') {
      // 1. قراءة تفاصيل المهمة
      const actionRef = doc(db, 'ai_actions', id);
      const actionSnap = await getDoc(actionRef);
      
      if (actionSnap.exists()) {
        const actionData = actionSnap.data();
        
        // 2. التحقق مما إذا كانت المهمة تخص فاتورة (مثلاً عن طريق type أو aiReasoning)
        const isInvoice = actionData.type?.toLowerCase().includes('invoice') || 
                          actionData.aiReasoning?.includes('فاتورة');
                          
        if (isInvoice) {
          // استخراج المبلغ بشكل تقريبي من النص (إن وُجد) أو وضع 0
          const amountMatch = actionData.context?.prompt?.match(/\d+/);
          const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
          
          // 3. إنشاء مستند جديد في مجموعة invoices
          await addDoc(collection(db, 'invoices'), {
            description: actionData.context?.prompt || actionData.aiReasoning || 'فاتورة جديدة',
            amount: amount,
            status: 'unpaid',
            createdAt: serverTimestamp(),
            sourceAiActionId: id
          });
        }
      }
      
      // 4. تحديث حالة المهمة
      const result = await approveAction(id);
      if (!result.success) throw new Error(result.message);
      
      return NextResponse.json({ success: true, message: result.message }, { status: 200 });
      
    } else if (status === 'rejected') {
      const result = await rejectAction(id);
      if (!result.success) throw new Error(result.message);
      
      return NextResponse.json({ success: true, message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error updating AI action status:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
