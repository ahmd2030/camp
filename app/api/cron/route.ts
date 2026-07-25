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
        
        // 3. Execute Agent Task
        const agentResponse = await getBoardMemberOpinion(task.agentId, task.prompt);
        let finalReport = agentResponse.response || 'No response generated.';
        
        if (!agentResponse.success) {
          finalReport = `Error during execution: ${agentResponse.response}`;
        }

        // 4. Save Report
        await addDoc(collection(db, 'autonomous_reports'), {
          taskId: taskId,
          agentId: task.agentId,
          content: finalReport,
          createdAt: now
        });

        // 5. Update Task Last Run Time
        await updateDoc(doc(db, 'scheduled_tasks', taskId), {
          lastRunTime: now
        });

        // 6. Send Email Notification
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

        results.push({ taskId, success: agentResponse.success });
      }
    }

    return NextResponse.json({ success: true, executedTasks: results });

  } catch (error: any) {
    console.error('Cron Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
