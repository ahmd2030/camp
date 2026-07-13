import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";

export interface TaskData {
  id?: string;
  title: string;
  description: string;
  assignedTo: string; // User Name
  clientName: string; // Related Client
  status: 'قيد التنفيذ' | 'مكتملة' | 'معلقة';
  dueDate: string;
}

const tasksCollection = collection(db, "tasks");

export const getTasks = async (): Promise<TaskData[]> => {
  try {
    const data = await getDocs(tasksCollection);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as TaskData));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export const addTask = async (task: TaskData) => {
  try {
    const docRef = await addDoc(tasksCollection, task);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding task:", error);
    return { success: false, error };
  }
};

export const deleteTask = async (id: string) => {
  try {
    const taskDoc = doc(db, "tasks", id);
    await deleteDoc(taskDoc);
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error };
  }
};

export const updateTaskStatus = async (id: string, status: 'قيد التنفيذ' | 'مكتملة' | 'معلقة') => {
  try {
    const taskDoc = doc(db, "tasks", id);
    await updateDoc(taskDoc, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error };
  }
};
