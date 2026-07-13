import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";

export interface ClientData {
  id?: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  status: string;
}

const clientsCollection = collection(db, "clients");

export const getClients = async (): Promise<ClientData[]> => {
  try {
    const data = await getDocs(clientsCollection);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as ClientData));
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
};

export const addClient = async (client: ClientData) => {
  try {
    const docRef = await addDoc(clientsCollection, client);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding client:", error);
    return { success: false, error };
  }
};

export const deleteClient = async (id: string) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await deleteDoc(clientDoc);
    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, error };
  }
};

export const updateClientStatus = async (id: string, status: string) => {
  try {
    const clientDoc = doc(db, "clients", id);
    await updateDoc(clientDoc, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating client status:", error);
    return { success: false, error };
  }
};
