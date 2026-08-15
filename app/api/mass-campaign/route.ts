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
  const CHUNK_SIZE = 5; // Process 5 leads per chunk

  try {
    let remainingToScrape = totalRequested;

    while (remainingToScrape > 0) {
      const currentChunkSize = Math.min(CHUNK_SIZE, remainingToScrape);
      
      await updateDoc(campaignRef, {
        message: `جاري البحث واستخراج ${currentChunkSize} عملاء جدد (الدفعة الحالية)... 🎣`
      });

      // 1. Scrape chunk
      const scrapeResult = await automateScraping(searchQuery, currentChunkSize);
      
      if (!scrapeResult.success || !scrapeResult.leads || scrapeResult.leads.length === 0) {
        // Break if no more leads found
        await updateDoc(campaignRef, {
          message: `لم نتمكن من العثور على مزيد من العملاء لهذا المجال.`
        });
        break;
      }

      const leadsChunk = scrapeResult.leads;

      // 2. Process each lead in chunk
      for (let i = 0; i < leadsChunk.length; i++) {
        const lead = leadsChunk[i];
        
        await updateDoc(campaignRef, {
          message: `معالجة العميل: ${lead.businessName}... 🚀`
        });

        try {
          const res = await queueAffiliateLead(lead, customProduct);
          
          if (res.success && lead.id) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'PENDING_AFFILIATE' });
            processedCount++;
            
            // Update progress
            await updateDoc(campaignRef, {
              processed: processedCount
            });
          }
        } catch (err) {
          console.warn('Failed to queue lead', lead.businessName);
        }

        // Wait 2 seconds between individual AI calls to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
      }

      remainingToScrape -= leadsChunk.length;

      // Optional: wait a bit between chunks
      if (remainingToScrape > 0) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Finished
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
