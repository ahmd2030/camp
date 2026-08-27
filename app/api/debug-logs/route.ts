import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
  const q = query(collection(db, 'webhook_logs'), orderBy('createdAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  const msgs: any[] = [];
  snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
  return NextResponse.json(msgs);
}
