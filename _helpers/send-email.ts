import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import fallbackConfig from '../config.json'; // Used as a fallback for local testing

export default async function sendEmail({ to, subject, html, from }: any) {
  let smtpOptions;
  let emailFrom;

  // 1. Check if the application is running live on Render
  if (process.env.NODE_ENV === 'production') {
    smtpOptions = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
    emailFrom = process.env.EMAIL_FROM;
  } else {
    // 2. Local Fallback: Dynamically read the fresh config file from your machine's project directory
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      smtpOptions = config.smtpOptions;
      emailFrom = config.emailFrom;
    } catch (error) {
      // Fallback if config.json is completely missing locally
      smtpOptions = fallbackConfig.smtpOptions;
      emailFrom = fallbackConfig.emailFrom;
    }
  }

  // 3. Fallback to the configured email mapping if no explicit 'from' address is passed
  const fromAddress = from || emailFrom;

  // 4. Create the transporter using the chosen production or local environment settings
  const transporter = nodemailer.createTransport(smtpOptions);

  // 5. Send the email
  await transporter.sendMail({ from: fromAddress, to, subject, html });
}