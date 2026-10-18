import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';
const appConnectionString = isTest && env.DATABASE_TEST_URL ? env.DATABASE_TEST_URL : env.DATABASE_URL;
const migrationConnectionString =
  isTest && env.DATABASE_TEST_URL
    ? env.DATABASE_TEST_URL
    : env.DATABASE_MIGRATION_URL || env.DATABASE_URL;

function buildSslConfig(connectionString: string) {
  const requiresSsl =
    env.DATABASE_SSL ||
    connectionString.includes('supabase.com') ||
    connectionString.includes('sslmode=require');

  if (!requiresSsl) {
    return false;
  }

  // If CA certificate is provided as a file path or string
  if (env.DATABASE_CA_CERT) {
    let caContent = env.DATABASE_CA_CERT;
    if (fs.existsSync(env.DATABASE_CA_CERT)) {
      caContent = fs.readFileSync(env.DATABASE_CA_CERT, 'utf-8');
    }
    return {
      rejectUnauthorized: true,
      ca: caContent,
    };
  }

  // Local/staging fallback when explicit CA is not configured
  return {
    rejectUnauthorized: false,
  };
}

// 1. Application pool: Targets the transaction pooler (port 6543)
const appPoolConfig: PoolConfig = {
  connectionString: appConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: buildSslConfig(appConnectionString),
};

export const pool = new Pool(appPoolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Application Pool Error]', err);
});

// 2. Migration pool: Targets the session pooler (port 5432) or direct connection for DDL operations
const migrationPoolConfig: PoolConfig = {
  connectionString: migrationConnectionString,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ssl: buildSslConfig(migrationConnectionString),
};

export const migrationPool = new Pool(migrationPoolConfig);

migrationPool.on('error', (err) => {
  console.error('[PostgreSQL Migration Pool Error]', err);
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
