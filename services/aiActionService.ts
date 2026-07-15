import { db } from "../lib/firebase";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AiAction } from "../types/ai";
import { checkAndDeductBudget } from "./budgetService";

// دالة لإنشاء مهمة جديدة من الذكاء الاصطناعي مع تدفق الموافقات
export const createAiAction = async (actionData: Omit<AiAction, 'id' | 'status' | 'createdAt' | 'executedAt'>) => {
  try {
    // 1. التحقق من الميزانية وخصم التكلفة قبل أي شيء
    const budgetCheck = await checkAndDeductBudget(actionData.costEstimate);
    if (!budgetCheck.success) {
      return { success: false, message: budgetCheck.message };
    }

    // 2. تحديد الحالة بناءً على حساسية المهمة (Human-in-the-Loop)
    const initialStatus = actionData.isSensitive ? 'pending_approval' : 'completed';

    // 3. تجهيز الكائن للحفظ في قاعدة البيانات
    const newAction: Omit<AiAction, 'id'> = {
      ...actionData,
      status: initialStatus,
      createdAt: serverTimestamp(),
    };

    // إذا كانت المهمة روتينية واكتملت، نسجل وقت التنفيذ
    if (initialStatus === 'completed') {
      newAction.executedAt = serverTimestamp();
    }

    // 4. الحفظ في Firestore
    const actionsRef = collection(db, "ai_actions");
    const docRef = await addDoc(actionsRef, newAction);

    return { 
      success: true, 
      id: docRef.id, 
      status: initialStatus,
      message: initialStatus === 'pending_approval' 
        ? "تم تعليق المهمة الحساسة بانتظار موافقة الإدارة." 
        : "تم تنفيذ المهمة الروتينية آلياً بنجاح."
    };
  } catch (error) {
    console.error("Error creating AI action:", error);
    return { success: false, message: "حدث خطأ داخلي أثناء إنشاء المهمة الذكية." };
  }
};

// دالة للموافقة على المهمة المعلقة
export const approveAction = async (actionId: string) => {
  try {
    const actionRef = doc(db, "ai_actions", actionId);
    await updateDoc(actionRef, {
      status: 'approved',
      // يمكن إضافة حقل updatedAt: serverTimestamp() إذا رغبنا مستقبلاً بتتبع متى تمت الموافقة
    });
    return { success: true, message: "تمت الموافقة على المهمة بنجاح." };
  } catch (error) {
    console.error("Error approving action:", error);
    return { success: false, message: "حدث خطأ أثناء محاولة الموافقة على المهمة." };
  }
};

// دالة لرفض المهمة المعلقة
export const rejectAction = async (actionId: string) => {
  try {
    const actionRef = doc(db, "ai_actions", actionId);
    await updateDoc(actionRef, {
      status: 'rejected'
    });
    return { success: true, message: "تم رفض المهمة وإلغاؤها." };
  } catch (error) {
    console.error("Error rejecting action:", error);
    return { success: false, message: "حدث خطأ أثناء محاولة رفض المهمة." };
  }
};
