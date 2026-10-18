import { createApp } from './app';
import { env } from './config/env';
import { pool, checkDatabaseConnection } from './db/pool';
import { initializeDummyHash } from './utils/dummy-hash';

async function startServer(): Promise<void> {
  console.log(`[Orwickle Dealroom] Initializing backend service (Environment: ${env.NODE_ENV})...`);

  // 1. Precompute static dummy Argon2id hash for constant-time authentication
  console.log('[Orwickle Security] Precomputing static Argon2id dummy hash...');
  await initializeDummyHash();
  console.log('[Orwickle Security] Dummy hash initialized successfully.');

  // 2. Validate Database Connectivity
  const dbCheck = await checkDatabaseConnection();
  if (dbCheck.ok) {
    console.log(`[PostgreSQL] Connection verified successfully (${dbCheck.latencyMs}ms).`);
  } else {
    console.warn(`[PostgreSQL Warning] Database connection check failed: ${dbCheck.error}`);
    console.warn('[PostgreSQL Warning] Ensure DATABASE_URL is configured and Supabase/PostgreSQL is accessible.');
  }

  // 3. Start Express Server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[Orwickle Dealroom] Service online at http://localhost:${env.PORT}`);
    console.log(`[Orwickle Dealroom] Health check available at http://localhost:${env.PORT}/health`);
  });

  // 4. Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Orwickle Shutdown] Received ${signal}. Terminating gracefully...`);
    server.close(async () => {
      console.log('[Orwickle Shutdown] HTTP server closed.');
      await pool.end();
      console.log('[Orwickle Shutdown] Database connection pool drained.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Orwickle Fatal Boot Error]', err);
  process.exit(1);
});
