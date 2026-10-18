import { Pool, PoolConfig } from 'pg';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';
const connectionString = isTest && env.DATABASE_TEST_URL ? env.DATABASE_TEST_URL : env.DATABASE_URL;

const requiresSsl =
  env.DATABASE_SSL ||
  connectionString.includes('supabase.com') ||
  connectionString.includes('sslmode=require');

const poolConfig: PoolConfig = {
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Unexpected Error]', err);
});

export async function checkDatabaseConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS connected');
      return { ok: true, latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err?.message || 'Database connection failure',
    };
  }
}
