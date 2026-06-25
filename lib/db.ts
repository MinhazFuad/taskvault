import mysql from 'mysql2/promise';
import { attachDatabasePool } from '@vercel/functions';

const globalForMysql = global as unknown as { mysqlPool: mysql.Pool };

const pool = globalForMysql.mysqlPool || mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForMysql.mysqlPool = pool;
}

attachDatabasePool(pool);

export default pool;