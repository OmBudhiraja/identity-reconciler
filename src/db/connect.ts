import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

async function connectDb() {
  if (!process.env.DB_URL) {
    throw new Error('DB_URL is required');
  }

  const connection = mysql.createPool(process.env.DB_URL);
  const db = drizzle(connection, {
    schema: schema,
    mode: 'default',
  });
  return db;
}

export type DB = Awaited<ReturnType<typeof connectDb>>;

export default connectDb;
