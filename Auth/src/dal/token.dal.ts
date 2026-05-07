import type pg from 'pg'
import { pool } from '../config/db.js'

export type RefreshTokenRow = {
  id: string
  user_id: string
  token_hash: string
  family_id: string
  expires_at: Date
  absolute_expires_at: Date
  revoked: boolean
  created_at: Date
}

export type InsertTokenInput = {
  userId: string
  tokenHash: string
  familyId: string
  expiresAt: Date
  absoluteExpiresAt: Date
}

function q(client?: pg.PoolClient) {
  return client ?? pool
}

// Insert refresh token metadata (hashed token only).
export async function insertToken(
  input: InsertTokenInput,
  client?: pg.PoolClient,
): Promise<RefreshTokenRow> {
  const res = await q(client).query<RefreshTokenRow>(
    'INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, absolute_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, token_hash, family_id, expires_at, absolute_expires_at, revoked, created_at',
    [
      input.userId,
      input.tokenHash,
      input.familyId,
      input.expiresAt,
      input.absoluteExpiresAt,
    ],
  )
  return res.rows[0]!
}

// Lookup refresh token by hash; missing rows return null.
export async function findByHash(
  hash: string,
  client?: pg.PoolClient,
): Promise<RefreshTokenRow | null> {
  const res = await q(client).query<RefreshTokenRow>(
    'SELECT id, user_id, token_hash, family_id, expires_at, absolute_expires_at, revoked, created_at FROM refresh_tokens WHERE token_hash = $1 LIMIT 1',
    [hash],
  )
  return res.rows[0] ?? null
}

// Revoke one refresh token by id.
export async function revokeToken(
  id: string,
  client?: pg.PoolClient,
): Promise<void> {
  await q(client).query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [
    id,
  ])
}

// Revoke entire token family on reuse detection.
export async function revokeFamily(
  familyId: string,
  client?: pg.PoolClient,
): Promise<void> {
  await q(client).query(
    'UPDATE refresh_tokens SET revoked = true WHERE family_id = $1',
    [familyId],
  )
}


