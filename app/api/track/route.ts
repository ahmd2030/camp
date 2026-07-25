import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

// 1x1 transparent GIF (base64)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');

  if (leadId) {
    try {
      // Find the sent_leads doc for this leadId
      const q = query(
        collection(db, 'sent_leads'),
        where('leadId', '==', leadId)
      );
      
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Update all matching sent_leads for this lead (usually just one, or the latest)
        // Better to update the most recent one if multiple, but we can just update all for simplicity
        const promises = snap.docs.map(d => {
          if (!d.data().opened) {
            return updateDoc(doc(db, 'sent_leads', d.id), {
              opened: true,
              openedAt: serverTimestamp()
            });
          }
          return Promise.resolve();
        });
        
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Tracking Error:', error);
    }
  }

  // Always return the transparent image
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
