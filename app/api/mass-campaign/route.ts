import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { automateScraping } from '@/app/actions/scraper';
import { queueAffiliateLead } from '@/app/actions/campaigns';

export const maxDuration = 60;

// Background task function
async function processMassCampaign(campaignId: string, searchQuery: string, totalRequested: number, customProduct: string | null) {
  const campaignRef = doc(db, 'mass_campaigns', campaignId);
  let processedCount = 0;
  let startOffset = 0;

  try {
    while (processedCount < totalRequested) {
      const needed = totalRequested - processedCount;
      const fetchLimit = Math.min(20, needed);
      
      await updateDoc(campaignRef, {
        message: `جاري البحث واستخراج دفعة جديدة... 🎣 (تم إنجاز ${processedCount})`
      });

      // 1. Scrape a full page from SerpApi (20 results)
      const scrapeResult = await automateScraping(searchQuery, 20, startOffset);
      
      if (!scrapeResult.success || !scrapeResult.leads || scrapeResult.leads.length === 0) {
        await updateDoc(campaignRef, {
          message: `لم نتمكن من العثور على مزيد من العملاء في هذا المجال.`
        });
        break;
      }

      const leadsChunk = scrapeResult.leads;
      let addedInThisChunk = 0;

      // 2. Process each lead
      for (let i = 0; i < leadsChunk.length; i++) {
        if (processedCount >= totalRequested) break;
        
        const lead = leadsChunk[i];
        
        await updateDoc(campaignRef, {
          message: `معالجة العميل: ${lead.businessName}... 🚀`
        });

        try {
          const res = await queueAffiliateLead(lead, customProduct);
          
          if (res.success && lead.id) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'PENDING_AFFILIATE' });
            processedCount++;
            addedInThisChunk++;
            
            await updateDoc(campaignRef, {
              processed: processedCount
            });
          }
        } catch (err) {
          console.warn('Failed to queue lead', lead.businessName);
        }

        // Wait a bit to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 1000));
      }

      // If we didn't add any new leads in this chunk, we might be stuck in a duplicate loop or out of leads
      if (addedInThisChunk === 0 && leadsChunk.length > 0) {
        startOffset += 20; // try next page anyway
      } else {
        startOffset += 20;
      }

      if (processedCount < totalRequested) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    await updateDoc(campaignRef, {
      status: 'COMPLETED',
      message: `تم الانتهاء بنجاح! تم تحويل ${processedCount} فرصة لقائمة الانتظار.`
    });

  } catch (error: any) {
    console.error('Mass campaign error:', error);
    await updateDoc(campaignRef, {
      status: 'ERROR',
      message: error.message || 'حدث خطأ غير متوقع أثناء معالجة الحملة.'
    });
  }
}

export async function POST(req: Request) {
  try {
    const { searchQuery, targetCount, customProduct } = await req.json();

    if (!searchQuery || !targetCount || typeof targetCount !== 'number') {
      return NextResponse.json({ error: 'البيانات المطلوبة غير صحيحة' }, { status: 400 });
    }

    // Create the tracker document
    const campaignDocRef = await addDoc(collection(db, 'mass_campaigns'), {
      searchQuery,
      totalRequested: targetCount,
      customProduct: customProduct || null,
      processed: 0,
      status: 'RUNNING',
      message: 'جاري تهيئة محرك الإطلاق...',
      createdAt: Timestamp.now()
    });

    // Use Next.js 15 `after` for reliable background execution on Vercel
    after(async () => {
      await processMassCampaign(campaignDocRef.id, searchQuery, targetCount, customProduct);
    });

    return NextResponse.json({ 
      success: true, 
      campaignId: campaignDocRef.id,
      message: 'تم بدء الحملة الجماعية في الخلفية' 
    });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الإرسال', details: error.message }, { status: 500 });
  }
}
