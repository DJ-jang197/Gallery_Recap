import type pg from 'pg'
import { pool } from '../config/db.js'

export type UserRow = {
  id: string
  email: string
  username: string
  password_hash: string
  is_compromised: boolean
  created_at: Date
}

function q(client?: pg.PoolClient) {
  return client ?? pool
}

// Query user by normalized email.
export async function findByEmail(
  email: string,
  client?: pg.PoolClient,
): Promise<UserRow | null> {
  const res = await q(client).query<UserRow>(
    'SELECT id, email, username, password_hash, is_compromised, created_at FROM users WHERE email = $1 LIMIT 1',
    [email],
  )
  return res.rows[0] ?? null
}

export async function findByUsername(
  username: string,
  client?: pg.PoolClient,
): Promise<UserRow | null> {
  const res = await q(client).query<UserRow>(
    'SELECT id, email, username, password_hash, is_compromised, created_at FROM users WHERE username = $1 LIMIT 1',
    [username],
  )
  return res.rows[0] ?? null
}

// Insert new user row with pre-hashed password.
export async function createUser(
  email: string,
  username: string,
  hash: string,
  client?: pg.PoolClient,
): Promise<UserRow> {
  const res = await q(client).query<UserRow>(
    'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, password_hash, is_compromised, created_at',
    [email, username, hash],
  )
  return res.rows[0]!
}

// Mark user as compromised after token reuse detection.
export async function flagCompromised(
  userId: string,
  client?: pg.PoolClient,
): Promise<void> {
  await q(client).query('UPDATE users SET is_compromised = true WHERE id = $1', [
    userId,
  ])
}


