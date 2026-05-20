import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import fallbackConfig from '../config.json'; 

export default async function sendEmail({ to, subject, html, from }: any) {
  let smtpOptions;
  let emailFrom;

  if (process.env.NODE_ENV === 'production' || process.env.SMTP_HOST) {
    smtpOptions = {
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // ADD THESE TIMEOUT RULES TO PREVENT STALLING:
      connectionTimeout: 5000, // 5 seconds max to connect
      greetingTimeout: 5000,   // 5 seconds max to greet
      socketTimeout: 5000      // 5 seconds max of inactivity
    };
    emailFrom = process.env.EMAIL_FROM || "noreply@ethereal.email";
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

  const fromAddress = from || emailFrom;
  const transporter = nodemailer.createTransport(smtpOptions);
  
  // Send the email
  await transporter.sendMail({ from: fromAddress, to, subject, html });
}