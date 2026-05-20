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
  // Add this block to bypass file writing if we are running in production / on Render
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Running on Render Cloud. Bypassing config.json disk writing automation.');
    
    // Continue establishing database connection normally using variables instead of raw files
    const host = process.env.DB_HOST || config.database.host;
    const port = Number(process.env.DB_PORT) || config.database.port;
    const user = process.env.DB_USER || config.database.user;
    const password = process.env.DB_PASSWORD || config.database.password;
    const database = process.env.DB_NAME || config.database.database;

    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    const sequelize = new Sequelize(database, user, password, { host, port, dialect: 'mysql' });

    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    await sequelize.sync({ alter: true });
    return; // Exit out early!
  }

  // --- YOUR ORIGINAL LOCAL DEVELOPMENT AUTOMATION CODE ---
  if (!config.smtpOptions.auth.user || config.smtpOptions.auth.user === "ora.dickinson31@ethereal.email") {
    console.log('🔄 Requesting a fresh dynamic Ethereal account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      config.smtpOptions.auth.user = testAccount.user;
      config.smtpOptions.auth.pass = testAccount.pass;
      config.emailFrom = testAccount.user;

      const configPath = path.join(__dirname, '../config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('✅ CONFIG.JSON OVERWRITTEN WITH FRESH ETHEREAL CREDS');
    } catch (err) {
      console.error('❌ Failed to dynamically generate or write Ethereal account:', err);
    }
  }
    
  // Local development fallback connection string setup
  const { host, port, user, password, database } = config.database;
  const connection = await mysql.createConnection({ host, port, user, password });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);
  db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
  db.RefreshToken.belongsTo(db.Account);
  await sequelize.sync({ alter: true });
}