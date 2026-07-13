import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // For Firestore Database
import { getAuth } from "firebase/auth"; // For Authentication

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaOvAYmj_jIxqV_GagdMWDwQlBARUskm4",
  authDomain: "camp-1198c.firebaseapp.com",
  projectId: "camp-1198c",
  storageBucket: "camp-1198c.firebasestorage.app",
  messagingSenderId: "1004619727115",
  appId: "1:1004619727115:web:a601e05a9f821305d3220e",
  measurementId: "G-DQXT417WBX"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
