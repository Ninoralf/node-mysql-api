import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import fallbackConfig from '../config.json'; 

export default async function sendEmail({ to, subject, html }: any) {
  let emailFrom;
  let apiKey = process.env.RESEND_API_KEY;

  // 1. Configure options based on environment
  if (process.env.NODE_ENV === 'production' || process.env.RESEND_API_KEY) {
    // Resend sandbox requires 'onboarding@resend.dev' as the "From" address
    emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";
  } else {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      emailFrom = config.emailFrom || "onboarding@resend.dev";
      if (!apiKey && config.resendApiKey) {
        apiKey = config.resendApiKey;
      }
    } catch (error) {
      emailFrom = fallbackConfig.emailFrom || "onboarding@resend.dev";
    }
  }

  // 2. Fallback printout rule: Always push the registration links to the Render Terminal
  console.log(`==================================================`);
  console.log(`✉️ OUTBOUND EMAIL TO: ${to}`);
  console.log(`Subject: ${subject}`);
  
  const tokenMatch = html.match(/token=([a-f0-9-]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    console.log(`🔑 VERIFICATION TOKEN: ${tokenMatch[1]}`);
    console.log(`🔗 DIRECT ACTIVATION LINK: https://angular-21-boilerplate-dse7.onrender.com/account/verify-email?token=${tokenMatch[1]}`);
  }
  console.log(`==================================================`);

  // 3. Attempt mail transmission safely via Resend HTTP API (Bypasses Render's network blocks)
  try {
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: emailFrom, // Uses 'onboarding@resend.dev'
      to: [to],
      subject: subject,
      html: html
    });

    console.log("✅ Mail delivered successfully via Resend API.");
  } catch (error) {
    console.log("⚠️ Resend API transmission failed, relying gracefully on terminal link fallback:", error);
  }
}