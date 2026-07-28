import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getBoardMemberOpinion } from '@/app/actions/team';
import { executeEmailAction } from '@/app/actions/email';

export const maxDuration = 60; // Allow Vercel to run this for up to 60s
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Active Tasks
    const tasksRef = collection(db, 'scheduled_tasks');
    const q = query(tasksRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    const now = Date.now();
    const results = [];

    for (const taskDoc of snapshot.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;
      
      let isDue = false;
      if (!task.lastRunTime) {
        isDue = true;
      } else {
        const diffMs = now - task.lastRunTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (task.frequency === 'daily' && diffDays >= 1) isDue = true;
        if (task.frequency === 'weekly' && diffDays >= 7) isDue = true;
        if (task.frequency === 'monthly' && diffDays >= 30) isDue = true;
      }

      if (isDue) {
        console.log(`Executing Cron Task: ${taskId} for agent: ${task.agentId}`);
        
        let finalReport = '';
        let success = false;

        if (task.type === 'affiliate_autopilot') {
          // Affiliate Autopilot Logic
          try {
            const { getAffiliateLinkById, getMailingListById } = await import('@/app/actions/affiliate');
            
            const linkRes = await getAffiliateLinkById(task.linkId);
            const listRes = await getMailingListById(task.listId);
            
            if (linkRes.success && listRes.success && listRes.list) {
              const link = linkRes.link!;
              const emails = listRes.list.emails;
              
              const prompt = `أنت مدير تسويق محترف (CMO). قم بصياغة بريد إلكتروني ترويجي جذاب عالي التحويل للمنتج التالي: "${link.productName}" في مجال "${link.niche}". يجب أن تدمج رابط الإحالة هذا بذكاء داخل النص: ${link.affiliateLink}. اكتب البريد بصيغة HTML جاهزة للإرسال، ولا تضف أي نصوص أخرى خارج الـ HTML. اجعل العنوان جذاباً وضع له عنوان Subject في أول سطر بالشكل التالي: Subject: عنوان جذاب`;
              
              const agentResponse = await getBoardMemberOpinion('cmo', prompt);
              
              if (agentResponse.success && agentResponse.response) {
                let htmlContent = agentResponse.response;
                let subject = `عرض خاص لمنتج ${link.productName}`;
                
                // Extract Subject if exists
                const subjectMatch = htmlContent.match(/Subject:\s*(.+)/i);
                if (subjectMatch) {
                  subject = subjectMatch[1].trim();
                  htmlContent = htmlContent.replace(/Subject:\s*(.+)/i, '').trim();
                }

                // Remove markdown code blocks if any
                htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

                // Send email to users individually via BCC loop or directly
                const adminEmail = process.env.ADMIN_EMAIL || '';
                
                // We will send to each user individually to ensure privacy (no one sees other emails)
                // For a production app, we would use Resend's batch API or BCC, here we loop for simplicity.
                let sentCount = 0;
                for (const userEmail of emails) {
                  // We BCC the admin on the first one, or just send a separate admin copy later.
                  await executeEmailAction(userEmail, subject, htmlContent);
                  sentCount++;
                }
                
                // Send admin copy
                if (adminEmail) {
                  await executeEmailAction(adminEmail, `[نسخة الإدارة - Autopilot] ${subject}`, `
                    <div style="background:#f1f5f9; padding:10px; margin-bottom:20px; direction:rtl; text-align:right;">
                      <strong>تقرير Autopilot:</strong> تم إرسال هذه الرسالة إلى ${sentCount} عملاء في القائمة البريدية "${listRes.list.name}".
                    </div>
                    ${htmlContent}
                  `);
                }

                finalReport = `نجاح: تم صياغة وإرسال البريد الترويجي لمنتج "${link.productName}" إلى ${sentCount} عملاء.`;
                success = true;
              } else {
                finalReport = `خطأ: لم يتمكن وكيل الذكاء الاصطناعي من صياغة البريد.`;
              }
            } else {
              finalReport = `خطأ: الرابط أو القائمة البريدية غير موجودة.`;
            }
          } catch (e: any) {
            finalReport = `خطأ في نظام Autopilot: ${e.message}`;
          }
        } else {
          // Standard Task Logic
          const agentResponse = await getBoardMemberOpinion(task.agentId, task.prompt);
          finalReport = agentResponse.response || 'No response generated.';
          success = agentResponse.success;
          
          if (!success) {
            finalReport = `Error during execution: ${agentResponse.response}`;
          }

          // Send Email Notification for standard task
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
            const emailSubject = `تقرير آلي جديد من ${task.agentId.toUpperCase()}`;
            const emailBody = `
              <h2>تقرير جديد: ${task.prompt}</h2>
              <p><strong>الموظف:</strong> ${task.agentId.toUpperCase()}</p>
              <p><strong>وقت التنفيذ:</strong> ${new Date(now).toLocaleString('ar-SA')}</p>
              <hr />
              <div style="white-space: pre-wrap; direction: rtl;">${finalReport}</div>
            `;
            await executeEmailAction(adminEmail, emailSubject, emailBody);
          }
        }

        // 4. Save Report
        await addDoc(collection(db, 'autonomous_reports'), {
          taskId: taskId,
          agentId: task.agentId || 'cmo',
          content: finalReport,
          createdAt: now
        });

        // 5. Update Task Last Run Time
        await updateDoc(doc(db, 'scheduled_tasks', taskId), {
          lastRunTime: now
        });

        results.push({ taskId, success });
      }
    }

    return NextResponse.json({ success: true, executedTasks: results });

  } catch (error: any) {
    console.error('Cron Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
