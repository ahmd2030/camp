import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { DailyBudget } from "../types/ai";

// الحد الأقصى الافتراضي اليومي للميزانية (مثلاً 5.00 دولار للاستهلاك)
const DEFAULT_DAILY_LIMIT = 5.00; 

// دالة مساعدة للحصول على تاريخ اليوم بصيغة نصية
export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // مثال: 2026-07-15
};

// الدالة الرئيسية: فحص الميزانية وخصم التكلفة
export const checkAndDeductBudget = async (costEstimate: number): Promise<{ success: boolean; message?: string }> => {
  const todayStr = getTodayDateString();
  const budgetRef = doc(db, "daily_budgets", todayStr);

  try {
    const budgetSnap = await getDoc(budgetRef);

    // إذا كان هذا أول إجراء للذكاء الاصطناعي في اليوم (لم يتم إنشاء مستند الميزانية بعد)
    if (!budgetSnap.exists()) {
      if (costEstimate > DEFAULT_DAILY_LIMIT) {
        return { success: false, message: "التكلفة المتوقعة للمهمة تتجاوز الحد الأقصى للميزانية اليومية." };
      }
      
      // تصفير الميزانية وتأسيسها لليوم الجديد
      const newBudget: DailyBudget = {
        date: todayStr,
        dailyLimit: DEFAULT_DAILY_LIMIT,
        spent: costEstimate, // يتم وضع التكلفة مباشرة كأول استهلاك
        currency: "USD"
      };
      await setDoc(budgetRef, newBudget);
      return { success: true };
    }

    // إذا كانت الميزانية موجودة اليوم، نقوم بالتحقق من الحد
    const budgetData = budgetSnap.data() as DailyBudget;
    
    if (budgetData.spent + costEstimate > budgetData.dailyLimit) {
      return { success: false, message: "تم الوصول للحد الأقصى للميزانية اليومية. سيتم إيقاف مهام الذكاء الاصطناعي حتى الغد." };
    }

    // خصم التكلفة بشكل دقيق وآمن باستخدام increment
    await updateDoc(budgetRef, {
      spent: increment(costEstimate)
    });

    return { success: true };

  } catch (error) {
    console.error("Error in budget service:", error);
    return { success: false, message: "حدث خطأ داخلي أثناء التحقق من الميزانية." };
  }
};
