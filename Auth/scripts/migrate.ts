import { pool } from '../src/config/db.js'

// Idempotent schema migration script.
async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_compromised BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;')
    await client.query(`
      UPDATE users
      SET username = split_part(email, '@', 1) || '_' || substring(replace(id::text, '-', '') from 1 for 8)
      WHERE username IS NULL
    `)
    await client.query('ALTER TABLE users ALTER COLUMN username SET NOT NULL;')

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        family_id UUID NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        absolute_expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);',
    )
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_rt_family ON refresh_tokens(family_id);',
    )
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    )
    await client.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);',
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


