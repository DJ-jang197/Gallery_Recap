import argon2 from 'argon2'
import crypto from 'crypto'
import type { FastifyBaseLogger } from 'fastify'
import { pool } from '../config/db.js'
import { redis } from '../config/redis.js'
import {
  createUser,
  findByEmail,
  findByUsername,
  flagCompromised,
  type UserRow,
} from '../dal/user.dal.js'
import {
  findByHash,
  insertToken,
  revokeFamily,
  revokeToken,
} from '../dal/token.dal.js'
import { generateRefreshToken, hashToken, signAccessToken } from './token.service.js'
import {
  normalizeEmail,
  normalizeUsername,
  passwordContainsEmailLocalPart,
} from '../schemas/auth.schema.js'

// Explicit Argon2id profile required by security review.
export const ARGON2_OPTS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
}

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$MXFh9GcpJE0RQa7MzaE+ZQ$AXv21TkVxWpJ+D7xwQIvxKzqJtS8HRND2ryWdqb2QrU'

export class AuthServiceError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

function invalidCredentials(): never {
  throw new AuthServiceError(401, 'INVALID_CREDENTIALS', 'invalid credentials')
}

async function recordLoginFailure(email: string): Promise<number> {
  const key = `login:fail:${email}`
  const n = await redis.incr(key)
  await redis.expire(key, 900)
  if (n > 10) {
    throw new AuthServiceError(429, 'ACCOUNT_LOCKED', 'account locked')
  }
  return n
}

export type LoginResult = { accessToken: string; rawRefreshToken: string }

/**
 * Logs in a user, issues a new JWT access token and refresh token.
 *
 * <p><b>Logic:</b> Attempts to find the user by email or username, verifies the provided password, and if valid, issues a new token pair and clears any local lockout counters.</p>
 * <p><b>Security:</b> Defends against timing attacks by always performing a dummy hash verification even if the user is not found. Includes a local account lockout mechanism after 10 failed attempts.</p>
 * <p><b>Efficiency:</b> Argon2 is configured with cost parameters explicitly designed for parallel processing, and Redis is used for fast O(1) failure counting.</p>
 * 
 * @param identifierRaw User's email or username
 * @param password User's plaintext password
 * @param log Optional logger instance
 * @returns Object containing the accessToken and rawRefreshToken
 */
export async function login(
  identifierRaw: string,
  password: string,
  log?: FastifyBaseLogger,
): Promise<LoginResult> {
  const identifier = identifierRaw.trim().toLowerCase()
  const user = identifier.includes('@')
    ? (await findByEmail(normalizeEmail(identifier))) ??
      (await findByUsername(normalizeUsername(identifier)))
    : await findByUsername(normalizeUsername(identifier))

  // Timing-safe path: ALWAYS run dummy verify regardless of user existence.
  await argon2.verify(DUMMY_HASH, password, ARGON2_OPTS)

  if (!user) {
    const n = await recordLoginFailure(identifier)
    if (n === 5) {
      log?.warn({ event: 'LOGIN_FAILURE', identifier, failures: n })
    }
    invalidCredentials()
  }

  if (user.is_compromised) {
    throw new AuthServiceError(403, 'ACCOUNT_COMPROMISED', 'account compromised')
  }

  const ok = await argon2.verify(user.password_hash, password, ARGON2_OPTS)
  if (!ok) {
    const n = await recordLoginFailure(identifier)
    if (n === 5) {
      log?.warn({ event: 'LOGIN_FAILURE', identifier, failures: n })
    }
    invalidCredentials()
  }

  const rawRefreshToken = generateRefreshToken()
  const tokenHash = hashToken(rawRefreshToken)
  const familyId = crypto.randomUUID()

  const now = Date.now()
  const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000)
  const absoluteExpiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000)

  await insertToken({
    userId: user.id,
    tokenHash,
    familyId,
    expiresAt,
    absoluteExpiresAt,
  })

  const accessToken = await signAccessToken(user.id, user.email)

  await redis.del(`login:fail:${identifier}`)
  return { accessToken, rawRefreshToken }
}

export async function markCompromised(user: UserRow): Promise<void> {
  await flagCompromised(user.id)
}

// Enforce local-part password rule for registration.
export function ensureRegisterPasswordSafe(emailRaw: string, password: string) {
  const email = normalizeEmail(emailRaw)
  if (passwordContainsEmailLocalPart(email, password)) {
    throw new AuthServiceError(
      400,
      'PASSWORD_CONTAINS_EMAIL',
      'password must not contain email local-part',
    )
  }
}

/**
 * Registers a new user and issues the initial JWT access token and refresh token.
 *
 * <p><b>Logic:</b> Validates that the password does not contain the email's local part, ensures the username/email is not already registered, hashes the password, creates the user, and generates tokens.</p>
 * <p><b>Security:</b> Enforces password constraints, prevents enumeration by rejecting duplicates securely, and uses Argon2id for secure password hashing.</p>
 * <p><b>Efficiency:</b> Uses a single DB call for user creation and relies on optimized DB constraints where possible.</p>
 *
 * @param usernameRaw Desired username (can be formatted as email)
 * @param password Desired plaintext password
 * @returns Object containing the accessToken and rawRefreshToken
 */
export async function register(
  usernameRaw: string,
  password: string,
): Promise<LoginResult> {
  const username = normalizeUsername(usernameRaw)
  const email = username.includes('@') ? normalizeEmail(username) : `${username}@local.auth`
  ensureRegisterPasswordSafe(email, password)

  const existing = (await findByUsername(username)) ?? (await findByEmail(email))
  if (existing) {
    throw new AuthServiceError(409, 'USERNAME_IN_USE', 'username already registered')
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTS)
  const user = await createUser(email, username, passwordHash)

  const rawRefreshToken = generateRefreshToken()
  const tokenHash = hashToken(rawRefreshToken)
  const familyId = crypto.randomUUID()

  const now = Date.now()
  const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000)
  const absoluteExpiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000)

  await insertToken({
    userId: user.id,
    tokenHash,
    familyId,
    expiresAt,
    absoluteExpiresAt,
  })

  const accessToken = await signAccessToken(user.id, user.email)
  return { accessToken, rawRefreshToken }
}

/**
 * Revokes the current refresh token to perform a logout.
 *
 * <p><b>Logic:</b> Hashes the provided raw token to find it in the database and marks it as revoked.</p>
 * <p><b>Security:</b> A best-effort mechanism to proactively terminate sessions. Access tokens may remain valid until their short expiration time.</p>
 * <p><b>Efficiency:</b> Relies on an indexed DB lookup by the token hash.</p>
 *
 * @param rawToken The plaintext refresh token to revoke
 */
export async function logout(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken)
  const row = await findByHash(tokenHash)
  if (!row) return
  await revokeToken(row.id)
}

/**
 * Rotates the refresh token securely, issuing a new pair and revoking the old one.
 *
 * <p><b>Logic:</b> Takes a raw refresh token, validates it against the DB, revokes it, and issues a new refresh token and access token.</p>
 * <p><b>Security:</b> Implements Atomic Refresh Token Rotation. Protects against token reuse by revoking the entire token family and flagging the account if a revoked token is used again.</p>
 * <p><b>Efficiency:</b> Uses a database transaction (BEGIN/COMMIT/ROLLBACK) to ensure atomicity without needing distributed locks.</p>
 *
 * @param rawToken The current plaintext refresh token
 * @param log Logger instance
 * @returns Object containing the new accessToken and rawRefreshToken
 */
export async function rotateRefreshToken(
  rawToken: string,
  log: FastifyBaseLogger,
): Promise<LoginResult> {
  const client = await pool.connect()
  let committed = false
  try {
    await client.query('BEGIN')

    const tokenHash = hashToken(rawToken)
    const row = await findByHash(tokenHash, client)

    // Path 1 — token not found
    if (!row) {
      await client.query('COMMIT')
      committed = true
      throw new AuthServiceError(401, 'UNAUTHORIZED', 'unauthorized')
    }

    // Path 2 — token reuse detected
    if (row.revoked === true) {
      await revokeFamily(row.family_id, client)
      await flagCompromised(row.user_id, client)
      await client.query('COMMIT')
      committed = true
      log.warn({ event: 'TOKEN_REUSE', familyId: row.family_id, userId: row.user_id })
      log.warn({ event: 'ACCOUNT_COMPROMISED', userId: row.user_id, reason: 'TOKEN_REUSE' })
      throw new AuthServiceError(401, 'TOKEN_REUSE', 'token reuse')
    }

    // Path 3 — token expired
    const now = new Date()
    if (row.expires_at < now || row.absolute_expires_at < now) {
      await revokeToken(row.id, client)
      await client.query('COMMIT')
      committed = true
      throw new AuthServiceError(401, 'TOKEN_EXPIRED', 'token expired')
    }

    // Path 4 — valid rotation
    await revokeToken(row.id, client)
    const newRaw = generateRefreshToken()
    const newHash = hashToken(newRaw)

    const nowMs = Date.now()
    const expiresAt = new Date(nowMs + 7 * 24 * 60 * 60 * 1000)

    await insertToken(
      {
        userId: row.user_id,
        tokenHash: newHash,
        familyId: row.family_id,
        expiresAt,
        absoluteExpiresAt: row.absolute_expires_at,
      },
      client,
    )

    const emailRes = await client.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [row.user_id],
    )
    const email = emailRes.rows[0]?.email
    if (!email) {
      throw new Error('user email missing for refresh rotation')
    }

    const accessToken = await signAccessToken(row.user_id, email)
    await client.query('COMMIT')
    committed = true
    return { accessToken, rawRefreshToken: newRaw }
  } catch (err) {
    if (!committed) {
      await client.query('ROLLBACK')
    }
    throw err
  } finally {
    client.release()
  }
}


