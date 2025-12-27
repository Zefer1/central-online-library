import pg from 'pg';

const { Pool } = pg;

const {
  DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/central_library',
} = process.env;

export const pool = new Pool({ connectionString: DATABASE_URL });

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
        return;
      } catch (innerErr) {
        console.error('Failed to create database automatically:', innerErr);
        throw innerErr;
      }
    }
    throw err;
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
