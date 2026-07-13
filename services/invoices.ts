import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";

export interface InvoiceData {
  id?: string;
  clientName: string;
  amount: number;
  description: string;
  issueDate: string;
  dueDate: string;
  status: 'مدفوعة' | 'غير مدفوعة' | 'متأخرة';
}

const invoicesCollection = collection(db, "invoices");

export const getInvoices = async (): Promise<InvoiceData[]> => {
  try {
    // Note: To use orderBy, you might need to create an index in Firebase console.
    // For simplicity in the MVP, we just getDocs.
    const data = await getDocs(invoicesCollection);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as InvoiceData));
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
};

export const addInvoice = async (invoice: InvoiceData) => {
  try {
    const docRef = await addDoc(invoicesCollection, invoice);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding invoice:", error);
    return { success: false, error };
  }
};

export const deleteInvoice = async (id: string) => {
  try {
    const invoiceDoc = doc(db, "invoices", id);
    await deleteDoc(invoiceDoc);
    return { success: true };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, error };
  }
};

export const updateInvoiceStatus = async (id: string, status: 'مدفوعة' | 'غير مدفوعة' | 'متأخرة') => {
  try {
    const invoiceDoc = doc(db, "invoices", id);
    await updateDoc(invoiceDoc, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return { success: false, error };
  }
};
