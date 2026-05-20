import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import fallbackConfig from '../config.json'; 

export default async function sendEmail({ to, subject, html, from }: any) {
  let smtpOptions;
  let emailFrom;

  // 1. Configure options based on environment
  if (process.env.NODE_ENV === 'production' || process.env.SMTP_HOST) {
    smtpOptions = {
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 465, // Fixed typo from 456 to 465
      secure: true, // Must be true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 4000, 
      greetingTimeout: 4000,   
      socketTimeout: 4000      
    };
    emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@ethereal.email";
  } else {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      smtpOptions = config.smtpOptions;
      emailFrom = config.emailFrom;
    } catch (error) {
      smtpOptions = fallbackConfig.smtpOptions;
      emailFrom = fallbackConfig.emailFrom;
    }
  }

  // 2. Fallback printout rule: Always push the registration links to the Render Terminal immediately
  console.log(`==================================================`);
  console.log(`✉️ OUTBOUND EMAIL TO: ${to}`);
  console.log(`Subject: ${subject}`);
  
  const tokenMatch = html.match(/token=([a-f0-9-]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    console.log(`🔑 VERIFICATION TOKEN: ${tokenMatch[1]}`);
    console.log(`🔗 DIRECT ACTIVATION LINK: https://angular-21-boilerplate-dse7.onrender.com/account/verify-email?token=${tokenMatch[1]}`);
  }
  console.log(`==================================================`);

  // 3. Attempt mail transmission safely within a try/catch sandbox block
  try {
    const transporter = nodemailer.createTransport(smtpOptions);
    await transporter.sendMail({ from: emailFrom, to, subject, html });
    console.log("✅ Mail delivered successfully via SMTP server.");
  } catch (error) {
    // If Render blocks the port, we catch the error here so the backend server doesn't freeze or crash!
    console.log("⚠️ SMTP connection blocked or timed out, relying gracefully on terminal link fallback.");
  }
}