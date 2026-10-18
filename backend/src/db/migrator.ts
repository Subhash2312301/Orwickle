import fs from 'fs';
import path from 'path';
import { migrationPool } from './pool';

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export async function runMigrations(): Promise<MigrationResult> {
  const client = await migrationPool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch applied migrations
    const res = await client.query('SELECT name FROM _migrations ORDER BY id ASC');
    const appliedSet = new Set<string>(res.rows.map((row) => row.name));

    // 3. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 4. Apply unapplied migrations inside isolated transactions
    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped.push(file);
        continue;
      }

      console.log(`[Migration] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
        console.log(`[Migration] Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration Error] Failed to apply ${file}:`, err);
        throw err;
      }
    }

    return { applied, skipped };
  } finally {
    client.release();
  }
}

// CLI Execution Support
if (require.main === module) {
  const command = process.argv[2] || 'up';

  if (command === 'up') {
    runMigrations()
      .then((res) => {
        console.log(`[Migration Summary] ${res.applied.length} applied, ${res.skipped.length} already up-to-date.`);
        process.exit(0);
      })
      .catch((err) => {
        console.error('[Migration Fatal Error]', err);
        process.exit(1);
      });
  } else {
    console.log(`Unknown command: ${command}. Use 'up'.`);
    process.exit(1);
  }
}
