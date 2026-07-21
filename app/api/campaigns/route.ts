import { NextResponse } from 'next/server';
import { addCampaign } from '@/services/campaigns';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.niche || !body.affiliateLink) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await addCampaign({
      niche: body.niche,
      platform: body.platform || 'غير محدد',
      signupLink: body.signupLink || '',
      affiliateLink: body.affiliateLink,
      status: 'ACTIVE'
    });

    if (result.success) {
      return NextResponse.json({ success: true, id: result.id });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to save to database' }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error saving campaign:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
