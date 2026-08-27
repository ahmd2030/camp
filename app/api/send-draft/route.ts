import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { executeEmailAction } from "@/app/actions/email";

export async function POST(request: Request) {
  try {
    const { messageId, replyText, clientEmail, subject } = await request.json();

    if (!messageId || !replyText || !clientEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const emailResult = await executeEmailAction(
      clientEmail,
      "رد: " + (subject || "رسالة من فريق Mango AI"),
      '<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; font-size: 15px;">' +
        replyText.replace(/\n/g, "<br>") +
      "</div>"
    );

    if (!emailResult.success) {
      return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 });
    }

    const docRef = doc(db, "contact_messages", messageId);
    await updateDoc(docRef, {
      finalResponse: replyText,
      status: "COMPLETED",
      sentAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send Draft Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
