import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const invoiceRef = doc(db, 'invoices', id);
    
    await updateDoc(invoiceRef, {
      status: 'paid',
      paidAt: serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Invoice marked as paid' }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
