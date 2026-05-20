import config from '../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';
import nodemailer from 'nodemailer'; // <-- 1. Import nodemailer
import fs from 'fs';                 // <-- 2. Import fs to read/write files
import path from 'path';             // <-- 3. Import path helper

const db: any = {};
export default db;

initialize();

async function initialize() {

  if (!config.smtpOptions.auth.user || config.smtpOptions.auth.user === "ora.dickinson31@ethereal.email") {
    console.log('🔄 Requesting a fresh dynamic Ethereal account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      // Update the active memory reference
      config.smtpOptions.auth.user = testAccount.user;
      config.smtpOptions.auth.pass = testAccount.pass;
      config.emailFrom = testAccount.user;

      // Locate config.json relative to this file path and write the changes down to the drive
      const configPath = path.join(__dirname, '../config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

      console.log('--------------------------------------------------');
      console.log('✅ CONFIG.JSON OVERWRITTEN WITH FRESH ETHEREAL CREDS:');
      console.log(`📧 User / Registered Email: ${testAccount.user}`);
      console.log(`🔑 SMTP Password:            ${testAccount.pass}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error('❌ Failed to dynamically generate or write Ethereal account:', err);
    }
  }
    
  const { host, port, user, password, database } = config.database;
  const connection = await mysql.createConnection({ host, port, user, password });

  // Create DB if it doesn't exist
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

  // Connect to DB
  const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

  // Init models
  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);

  // Define relationships
  db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
  db.RefreshToken.belongsTo(db.Account);

  // Sync models with database
  await sequelize.sync();
}