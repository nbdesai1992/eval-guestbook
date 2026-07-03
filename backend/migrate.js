'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}

// SSL only for Render external hosts (*.render.com); internal host needs no SSL.
const useSsl = /\.render\.com/.test(DATABASE_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A brand-new free Postgres may not accept connections yet on first boot.
// pg Clients can't be reused after a failed connect(), so build a fresh one each try.
async function connectWithRetry(attempts = 12, delayMs = 3000) {
  for (let i = 1; i <= attempts; i += 1) {
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
    try {
      await client.connect();
      return client;
    } catch (err) {
      try { await client.end(); } catch (_) { /* ignore */ }
      if (i === attempts) throw err;
      console.log(`db not ready (attempt ${i}/${attempts}): ${err.message}; retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
}

async function main() {
  const client = await connectWithRetry();

  await client.query(
    'create table if not exists schema_migrations (filename text primary key, applied_at timestamptz default now())'
  );

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await client.query('select filename from schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('insert into schema_migrations (filename) values ($1)', [file]);
      await client.query('COMMIT');
      count += 1;
      console.log(`applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`migration failed for ${file}: ${err.message}`);
    }
  }

  console.log(`migrations complete: ${count} applied, ${files.length} total`);
  await client.end();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
