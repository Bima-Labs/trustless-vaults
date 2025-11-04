import mysql from 'mysql2/promise';
import type { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';

// Create a connection pool. This is more efficient than creating a new connection for every query.
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '1234',
  database: process.env.MYSQL_DATABASE || 'btc_vault',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

type QueryResult = RowDataPacket[] | RowDataPacket[][] | OkPacket | OkPacket[] | ResultSetHeader;

// A helper function to execute queries.
export const query = async <T extends QueryResult>(sql: string, params: any[] = []): Promise<T> => {
  try {
    const [results] = await pool.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error('Database Query Error:', error);
    // Re-throw the original error for better debugging in the calling function
    throw error;
  }
};

export type { RowDataPacket, ResultSetHeader };