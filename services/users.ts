import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";

export interface UserData {
  id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string;
}

const usersCollection = collection(db, "users");

export const getUsers = async (): Promise<UserData[]> => {
  try {
    const data = await getDocs(usersCollection);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserData));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const addUser = async (user: UserData) => {
  try {
    const docRef = await addDoc(usersCollection, user);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding user:", error);
    return { success: false, error };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const userDoc = doc(db, "users", id);
    await deleteDoc(userDoc);
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error };
  }
};

export const updateUserStatus = async (id: string, status: string) => {
  try {
    const userDoc = doc(db, "users", id);
    await updateDoc(userDoc, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating user status:", error);
    return { success: false, error };
  }
};
