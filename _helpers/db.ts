import config from '../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';
import nodemailer from 'nodemailer'; 
import fs from 'fs';                 
import path from 'path';             

const db: any = {};
export default db;

initialize();

async function initialize() {
  // 1. PRODUCTION MODE (Render + TiDB Cloud)
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Running on Render Cloud. Connecting to TiDB Serverless...');
    
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT) || 4000; // TiDB defaults to port 4000
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'node_mysql_api';

    // Establish raw initial connection to ensure target database space schema exists
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end(); // Cleanly close raw initial connection handshake

    // Initialize Sequelize configured explicitly for TiDB's SSL requirements
    const sequelize = new Sequelize(database, user!, password, { 
      host, 
      port, 
      dialect: 'mysql',
      dialectOptions: {
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true // Enforces security validation across the cloud
        }
      },
      logging: false // Keeps your Render logs clean from SQL queries
    });

    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    
    await sequelize.sync({ alter: true });
    console.log('✅ TiDB Cloud database models synchronized successfully!');
    return; // Exit out early!
  }

  // 2. LOCAL DEVELOPMENT MODE (Your Local Machine)
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
  await connection.end();

  const sequelize = new Sequelize(database, user, password, { 
    host,
    port,
    dialect: 'mysql' 
  });

  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);
  db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
  db.RefreshToken.belongsTo(db.Account);
  
  await sequelize.sync({ alter: true });
  console.log('💻 Local development database models synchronized successfully!');
}