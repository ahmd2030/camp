import { NextResponse } from 'next/server';
import { approveAction, rejectAction } from '@/services/aiActionService';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Dummy virtual card generator (CFO Engine Placeholder)
async function generateVirtualCard(amount: number, description: string) {
  console.log(`[CFO Engine] 💳 Generating Virtual Card via Stripe Issuing...`);
  console.log(`[CFO Engine] Amount: $${amount}, Description: ${description}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const cardNumber = `4000 1234 5678 ${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`[CFO Engine] ✅ Virtual Card Generated: ${cardNumber}`);
  
  return {
    success: true,
    cardNumber,
    cvv: "123",
    expiry: "12/28"
  };
}

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
        
        // استخراج المبلغ بشكل تقريبي من النص
        const amountMatch = actionData.context?.prompt?.match(/\d+/);
        const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
        const description = actionData.context?.prompt || actionData.aiReasoning || 'مهمة ذكية';

        // 2. التحقق مما إذا كانت المهمة تخص فاتورة
        const isInvoice = actionData.type?.toLowerCase().includes('invoice') || 
                          actionData.category === 'financial' ||
                          actionData.aiReasoning?.includes('فاتورة');
                          
        if (isInvoice) {
          // 3. إنشاء مستند جديد في مجموعة invoices وربطه بالعميل
          await addDoc(collection(db, 'invoices'), {
            description: description,
            amount: amount,
            status: 'unpaid',
            createdAt: serverTimestamp(),
            sourceAiActionId: id,
            clientId: actionData.clientId || null,
            clientName: actionData.clientName || null
          });
        }

        // 4. البطاقات الافتراضية للمدفوعات الخارجية
        if (actionData.requires_payment) {
          await generateVirtualCard(amount || 100, description);
        }
      }
      
      // 5. تحديث حالة المهمة
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
