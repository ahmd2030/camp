import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";

const TRAINING_QUESTIONS = [
  "ما هي الخدمات التي تقدمها شركتكم بالتفصيل؟ اذكر كل خدمة مع وصف مختصر لها.",
  "ما هي أسعاركم الدقيقة لكل خدمة؟ وما هي العوامل التي تؤثر في السعر؟",
  "ما الذي يميزكم عن المنافسين؟ ما هي نقاط قوتكم الفريدة؟",
  "هل لديكم عملاء سابقون أو حالات نجاح (Case Studies) يمكن ذكرها كمرجع؟",
  "ما هو الجمهور المستهدف لخدماتكم؟ (حجم الشركات، القطاعات، المناطق الجغرافية)",
  "هل توفرون فترة تجريبية أو عروض خاصة؟ ما هي شروطها؟",
  "ما هي الأسئلة التي يسألها العملاء عادة؟ وكيف تريدني أن أجيب عليها؟",
  "هل هناك خدمات لا تقدمونها ولكن تريدني أن أرشح بدائل موثوقة لها (Affiliate)؟",
  "ما هي طريقة الدفع المعتمدة؟ وهل يوجد تقسيط أو مراحل دفع؟",
  "هل هناك تعليمات أو قواعد صارمة تريدني أن ألتزم بها عند الرد على العملاء؟"
];

// GET: Fetch all knowledge + determine next question
export async function GET() {
  try {
    const knowledgeSnap = await getDocs(query(collection(db, "company_knowledge"), orderBy("createdAt", "asc")));
    const knowledge: any[] = [];
    knowledgeSnap.forEach(doc => knowledge.push({ id: doc.id, ...doc.data() }));

    const answeredCount = knowledge.filter(k => k.source === "training").length;
    const nextQuestionIndex = answeredCount < TRAINING_QUESTIONS.length ? answeredCount : -1;
    const nextQuestion = nextQuestionIndex >= 0 ? TRAINING_QUESTIONS[nextQuestionIndex] : null;
    const totalQuestions = TRAINING_QUESTIONS.length;
    const isComplete = answeredCount >= totalQuestions;

    return NextResponse.json({
      knowledge,
      nextQuestion,
      nextQuestionIndex,
      answeredCount,
      totalQuestions,
      isComplete,
      progress: Math.round((answeredCount / totalQuestions) * 100)
    });
  } catch (error: any) {
    console.error("Training GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save an answer to the knowledge base
export async function POST(request: Request) {
  try {
    const { question, answer, category, source } = await request.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    await addDoc(collection(db, "company_knowledge"), {
      question,
      answer,
      category: category || "general",
      source: source || "training",
      createdAt: serverTimestamp()
    });

    // Return the next question
    const knowledgeSnap = await getDocs(query(collection(db, "company_knowledge"), orderBy("createdAt", "asc")));
    const answeredCount = knowledgeSnap.size;
    const nextQuestionIndex = answeredCount < TRAINING_QUESTIONS.length ? answeredCount : -1;
    const nextQuestion = nextQuestionIndex >= 0 ? TRAINING_QUESTIONS[nextQuestionIndex] : null;

    return NextResponse.json({
      success: true,
      nextQuestion,
      answeredCount,
      totalQuestions: TRAINING_QUESTIONS.length,
      isComplete: answeredCount >= TRAINING_QUESTIONS.length,
      progress: Math.round((answeredCount / TRAINING_QUESTIONS.length) * 100)
    });
  } catch (error: any) {
    console.error("Training POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
