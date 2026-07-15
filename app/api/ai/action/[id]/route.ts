import { NextResponse } from 'next/server';
import { approveAction, rejectAction } from '@/services/aiActionService';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    let result;
    if (status === 'approved') {
      result = await approveAction(id);
    } else if (status === 'rejected') {
      result = await rejectAction(id);
    } else {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: result.message }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating AI action status:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
