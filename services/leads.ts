import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  query,
  orderBy,
  where
} from "firebase/firestore";

export interface LeadData {
  id?: string;
  businessName: string;
  email?: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  website: string;
  painPoint: string;
  aiPitch: string;
  status: 'PENDING' | 'READY_TO_SEND' | 'PITCH_SENT' | 'CLICKED' | 'CONVERTED';
  createdAt?: any;
}

const leadsCollection = collection(db, "leads");

export const getLeads = async (): Promise<LeadData[]> => {
  try {
    const q = query(leadsCollection, orderBy('createdAt', 'desc'));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeadData));
  } catch (error) {
    console.error("Error fetching leads:", error);
    // Fallback if index missing
    try {
      const data = await getDocs(leadsCollection);
      return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeadData));
    } catch(e) {
      return [];
    }
  }
};

export const getReadyLeads = async (): Promise<LeadData[]> => {
  try {
    const q = query(leadsCollection, where('status', '==', 'READY_TO_SEND'));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeadData));
  } catch (error) {
    console.error("Error fetching ready leads:", error);
    return [];
  }
};

export const addLead = async (lead: LeadData) => {
  try {
    const docRef = await addDoc(leadsCollection, {
      ...lead,
      createdAt: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding lead:", error);
    return { success: false, error };
  }
};

export const updateLeadStatus = async (id: string, status: 'PENDING' | 'READY_TO_SEND' | 'PITCH_SENT' | 'CLICKED' | 'CONVERTED') => {
  try {
    const leadDoc = doc(db, "leads", id);
    await updateDoc(leadDoc, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating lead status:", error);
    return { success: false, error };
  }
};
