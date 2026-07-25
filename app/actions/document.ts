"use server";
import * as pdfParseModule from 'pdf-parse';

export async function extractTextFromFile(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: "لم يتم العثور على ملف" };

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) return { success: false, error: "حجم الملف يتجاوز 5 ميجابايت" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const name = file.name.toLowerCase();

    let text = '';

    if (name.endsWith('.pdf')) {
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
      // Raw string for TXT and CSV
      text = buffer.toString('utf-8');
    } else {
      return { success: false, error: "صيغة الملف غير مدعومة. يرجى إرفاق (PDF, CSV, TXT) فقط." };
    }

    // Basic limit to prevent overwhelming tokens (approx 12,000 tokens)
    const MAX_CHARS = 50000;
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + "\n\n...[تم قص المحتوى لتجاوز الحد الأقصى للملفات]...";
    }

    return { success: true, text, name: file.name };
  } catch (error: any) {
    console.error("Document Parsing Error:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء قراءة الملف." };
  }
}
