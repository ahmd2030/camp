import { auth } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";

/**
 * تسجيل الدخول باستخدام البريد وكلمة المرور
 */
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let errorMessage = "حدث خطأ غير متوقع.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = "تم حظر الحساب مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.";
    }
    return { user: null, error: errorMessage };
  }
};

/**
 * تسجيل الخروج
 */
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * مراقبة حالة المستخدم (هل هو مسجل دخول أم لا)
 */
export const listenToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
