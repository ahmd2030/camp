"use server";

export async function checkIntegrationsStatus() {
  return {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    cron: !!process.env.CRON_SECRET,
    firebase: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // Vercel is always true as it's the hosting environment, or we can just mock it
    vercel: true,
  };
}
