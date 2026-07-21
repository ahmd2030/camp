import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore";

export interface SuggestedNiche {
  id?: string;
  title: string;
  searchQuery: string;
  justification: string;
  expectedCommission: string;
  painPoint: string;
  status: 'ACTIVE' | 'APPROVED' | 'REJECTED';
  createdAt?: any;
}

export const addNiches = async (niches: SuggestedNiche[]) => {
  try {
    const promises = niches.map(niche => 
      addDoc(collection(db, "suggested_niches"), {
        ...niche,
        status: 'ACTIVE',
        createdAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (error: any) {
    console.error("Error adding niches:", error);
    return { success: false, error: error.message };
  }
};

export const getActiveNiches = async (): Promise<{ success: boolean; data?: SuggestedNiche[]; error?: string }> => {
  try {
    const q = query(
      collection(db, "suggested_niches"),
      where("status", "==", "ACTIVE"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    const data: SuggestedNiche[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as SuggestedNiche);
    });
    return { success: true, data };
  } catch (error: any) {
    // If the index is not created yet, it might throw an error. We can fallback to fetching all ACTIVE.
    if (error.message.includes('index')) {
      console.warn("Index not found, falling back to basic query");
      try {
        const qBasic = query(collection(db, "suggested_niches"), where("status", "==", "ACTIVE"));
        const snapshot = await getDocs(qBasic);
        const data: SuggestedNiche[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as SuggestedNiche));
        // Sort manually
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        return { success: true, data: data.slice(0, 10) };
      } catch (fallbackError: any) {
        return { success: false, error: fallbackError.message };
      }
    }
    console.error("Error fetching active niches:", error);
    return { success: false, error: error.message };
  }
};

export const updateNicheStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
  try {
    const nicheDoc = doc(db, "suggested_niches", id);
    await updateDoc(nicheDoc, { status });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating niche:", error);
    return { success: false, error: error.message };
  }
};
