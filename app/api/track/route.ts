import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// 1x1 transparent GIF (base64)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');
  const action = searchParams.get('action'); // 'open' or 'click'
  const targetUrl = searchParams.get('url');

  if (leadId) {
    try {
      const docRef = doc(db, 'requests', leadId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        if (action === 'open') {
          if (!data.opened) {
            await updateDoc(docRef, {
              opened: true,
              openedAt: serverTimestamp()
            });
          }
        } else if (action === 'click' && targetUrl) {
          if (!data.clicked) {
            await updateDoc(docRef, {
              clicked: true,
              clickedAt: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error('Tracking Error:', error);
    }
  }

  if (action === 'click' && targetUrl) {
    // Redirect to the target URL
    return NextResponse.redirect(targetUrl);
  }

  // Always return the transparent image for opens or missing actions
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
