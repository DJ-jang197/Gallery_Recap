import crypto from 'crypto'
import { pathToFileURL } from 'url'
import {
  SignJWT,
  exportJWK,
  jwtVerify,
  calculateJwkThumbprint,
} from 'jose'
import { privateKey, publicKey } from '../config/keys.js'
import { redis } from '../config/redis.js'

// Issue 15-minute RS256 access token with mandatory jti.
export async function signAccessToken(
  userId: string,
  email: string,
): Promise<string> {
  return await new SignJWT({ sub: userId, email, jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(await privateKey)
}

// Generate high-entropy raw refresh token.
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

// Hash refresh token for DB storage.
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// Build JWKS payload for public key discovery.
export async function buildJwks(): Promise<object> {
  const jwk = await exportJWK(await publicKey)
  const kid = await calculateJwkThumbprint(jwk)
  return { keys: [{ ...jwk, kid, alg: 'RS256' }] }
}

// Blocklist access token jti for remaining token lifetime.
export async function revokeAccessToken(
  jti: string,
  remainingTtlSeconds: number,
) {
  await redis.set(`blocklist:${jti}`, '1', 'EX', remainingTtlSeconds)
}

// Check whether access token jti has been revoked.
export async function isAccessTokenRevoked(jti: string): Promise<boolean> {
  return (await redis.exists(`blocklist:${jti}`)) === 1
}

function base64UrlDecodeToJson(segment: string): any {
  const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4))
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + pad
  const json = Buffer.from(b64, 'base64').toString('utf8')
  return JSON.parse(json)
}

async function selfTest() {
  const userId = crypto.randomUUID()
  const email = 'test@example.com'
  const token = await signAccessToken(userId, email)
  const payload = base64UrlDecodeToJson(token.split('.')[1]!)

  if (payload.exp - payload.iat !== 900) {
    throw new Error(`exp-iat must be 900, got ${payload.exp - payload.iat}`)
  }

  const uuidV4ish = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidV4ish.test(payload.jti)) {
    throw new Error(`jti must be UUID, got ${payload.jti}`)
  }

  await jwtVerify(token, await publicKey)
  process.stdout.write('token.service self-test PASS\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  selfTest().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
}


