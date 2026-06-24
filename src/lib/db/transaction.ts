import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST!,
  port: Number(process.env.SUPABASE_DB_PORT!) || 6543,
  database: process.env.SUPABASE_DB_NAME!,
  user: process.env.SUPABASE_DB_USER!,
  password: process.env.SUPABASE_DB_PASSWORD!,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export type QueryExecutor = (
  text: string,
  params?: unknown[]
) => Promise<{ rows: any[] }>;

export async function withTransaction<T>(
  fn: (query: QueryExecutor) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query: QueryExecutor = (text, params) => client.query(text, params);
    const result = await fn(query);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
