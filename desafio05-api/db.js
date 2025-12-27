import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();

const { DATABASE_URL } = process.env;
if (!DATABASE_URL && process.env.CI) {
  throw new Error('DATABASE_URL must be set in CI (GitHub Actions)');
}
if (!DATABASE_URL && nodeEnv === 'production') {
  throw new Error('DATABASE_URL must be set in production');
}

const connectionString = DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/central_library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'db', 'migrations');

export const pool = new Pool({ connectionString });

export async function ensureDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS livros (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        num_paginas INTEGER NOT NULL CHECK (num_paginas > 0),
        isbn TEXT NOT NULL,
        editora TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    // Enforce unique ISBN (scalable lookup + prevents duplicates)
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS livros_isbn_unique ON livros (isbn)');
    await runMigrations();
  } catch (err) {
    // If database does not exist, optionally try creating it by connecting to the default 'postgres' DB
    const missingDb = err?.code === '3D000' || /does not exist/i.test(err?.message || '');
    if (missingDb) {
      const auto = (process.env.AUTO_CREATE_DB || 'false').toLowerCase() === 'true';
      if (!auto) {
        // Re-throw so caller (or CI) knows DB is missing
        throw new Error(`Database does not exist and AUTO_CREATE_DB is not enabled: ${err.message}`);
      }
      try {
        const url = new URL(DATABASE_URL);
        const dbName = url.pathname ? url.pathname.replace(/\//g, '') : null;
        if (!dbName) throw err;
        // connect to default 'postgres' database on same host
        url.pathname = '/postgres';
        const adminPool = new Pool({ connectionString: url.toString() });
        try {
          await adminPool.query(`CREATE DATABASE "${dbName}"`);
        } catch (createErr) {
          // Ignore "already exists" races
          if (createErr?.code !== '42P04') throw createErr;
        }
        await adminPool.end();
        // now try again to create the table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS livros (
            id SERIAL PRIMARY KEY,
            titulo TEXT NOT NULL,
            num_paginas INTEGER NOT NULL CHECK (num_paginas > 0),
            isbn TEXT NOT NULL,
            editora TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `);
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS livros_isbn_unique ON livros (isbn)');
        await runMigrations();
        return;
      } catch (innerErr) {
        console.error('Failed to create database automatically:', innerErr);
        throw innerErr;
      }
    }
    throw err;
  }
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_on TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  let files = [];
  try {
    files = await fs.readdir(migrationsDir);
  } catch (err) {
    if (err?.code === 'ENOENT') return; // no migrations folder yet
    throw err;
  }

  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  if (!sqlFiles.length) return;

  const { rows } = await pool.query('SELECT name FROM migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of sqlFiles) {
    if (applied.has(file)) continue;
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Migration applied: ${file}`);
    } catch (migrationErr) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${file}`, migrationErr);
      throw migrationErr;
    } finally {
      client.release();
    }
  }
}

export async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM livros');
  if (rows[0]?.count > 0) return;
  await pool.query(
    `INSERT INTO livros (titulo, num_paginas, isbn, editora) VALUES
      ($1,$2,$3,$4),
      ($5,$6,$7,$8),
      ($9,$10,$11,$12)`,
    [
      'Clean Code', 464, '978-0132350884', 'Prentice Hall',
      'Design Patterns', 395, '978-0201633610', 'Addison-Wesley',
      'Refactoring', 448, '978-0134757599', 'Addison-Wesley'
    ],
  );
}
