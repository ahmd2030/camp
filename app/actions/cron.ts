"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';

export interface ScheduledTask {
  id?: string;
  agentId: string;
  prompt: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRunTime: number | null;
  isActive: boolean;
  createdAt: number;
}

export interface AutonomousReport {
  id?: string;
  taskId: string;
  agentId: string;
  content: string;
  createdAt: number;
}

export async function createScheduledTask(data: Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRunTime'>) {
  try {
    const docRef = await addDoc(collection(db, 'scheduled_tasks'), {
      ...data,
      lastRunTime: null,
      createdAt: Date.now()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Failed to create task:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleTaskStatus(taskId: string, currentStatus: boolean) {
  try {
    const taskRef = doc(db, 'scheduled_tasks', taskId);
    await updateDoc(taskRef, {
      isActive: !currentStatus
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle task:", error);
    return { success: false, error: error.message };
  }
}

export async function getScheduledTasks() {
  try {
    const q = query(collection(db, 'scheduled_tasks'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return {
      success: true,
      tasks: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledTask))
    };
  } catch (error: any) {
    console.error("Failed to fetch tasks:", error);
    return { success: false, error: error.message, tasks: [] };
  }
}

export async function getAutonomousReports() {
  try {
    const q = query(collection(db, 'autonomous_reports'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return {
      success: true,
      reports: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutonomousReport))
    };
  } catch (error: any) {
    console.error("Failed to fetch reports:", error);
    return { success: false, error: error.message, reports: [] };
  }
}
