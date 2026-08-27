import { NextResponse } from 'next/server';

export async function GET() {
  // Check all possible env var names
  const checks = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing',
  };

  // Also try a live Gemini call with each key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  let geminiTest = 'no key found';
  
  if (apiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'say hello in arabic in one word' }] }]
          })
        }
      );
      const data = await resp.json();
      if (resp.ok) {
        geminiTest = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'empty response';
      } else {
        geminiTest = `HTTP ${resp.status}: ${JSON.stringify(data)}`;
      }
    } catch (e: any) {
      geminiTest = `fetch error: ${e.message}`;
    }
  }

  return NextResponse.json({ envChecks: checks, geminiTest });
}
