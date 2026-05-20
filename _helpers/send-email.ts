import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export default async function sendEmail({ to, subject, html, from }: any) {
  // 1. Dynamically read the fresh config file from the project root directory
  const configPath = path.join(process.cwd(), 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 2. Fallback to the newly written config.emailFrom if no 'from' address is passed
  const fromAddress = from || config.emailFrom;

  // 3. Create the transporter using the fresh SMTP options from disk
  const transporter = nodemailer.createTransport(config.smtpOptions);

  // 4. Send the email
  await transporter.sendMail({ from: fromAddress, to, subject, html });
}