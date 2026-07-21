import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query,
  orderBy
} from "firebase/firestore";

export interface CampaignData {
  id?: string;
  niche: string;
  platform: string;
  signupLink: string;
  affiliateLink: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt?: any;
}

const campaignsCollection = collection(db, "campaigns");

export const addCampaign = async (campaign: CampaignData) => {
  try {
    const docRef = await addDoc(campaignsCollection, {
      ...campaign,
      createdAt: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding campaign:", error);
    return { success: false, error };
  }
};

export const getCampaigns = async (): Promise<CampaignData[]> => {
  try {
    const q = query(campaignsCollection, orderBy('createdAt', 'desc'));
    const data = await getDocs(q);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as CampaignData));
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    try {
      const data = await getDocs(campaignsCollection);
      return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as CampaignData));
    } catch(e) {
      return [];
    }
  }
};
