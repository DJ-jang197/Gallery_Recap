import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { LoginSchema, RegisterSchema } from '../schemas/auth.schema.js'
import {
  login,
  logout,
  register,
  rotateRefreshToken,
  AuthServiceError,
} from '../services/auth.service.js'
import { buildJwks } from '../services/token.service.js'

// Shared cookie options for refresh token issuance and clearing.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/auth/refresh',
    signed: true,
    maxAge: 7 * 24 * 60 * 60,
  }
}

function getSignedRefreshToken(req: FastifyRequest): string | null {
  const signed = (req.cookies as any)?.refresh_token as string | undefined
  if (!signed) return null
  const unsign = (req as any).unsignCookie?.(signed) as
    | { valid: boolean; value: string | null }
    | undefined
  if (!unsign?.valid || !unsign.value) return null
  return unsign.value
}

/**
 * POST /auth/register
 * 
 * <p><b>Logic:</b> Parses and validates the incoming request body, delegates user creation to the auth service, sets a secure HTTP-only cookie with the refresh token, and returns the access token.</p>
 * <p><b>Security:</b> Input validation via Zod ensures only well-formed requests are processed. Issues tokens via secure cookie attributes (HttpOnly, Secure, SameSite=Strict) to mitigate XSS and CSRF.</p>
 * <p><b>Efficiency:</b> Uses Fastify's built-in fast JSON parsing and serialization alongside Zod's optimized schema validation.</p>
 */
export async function registerHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const body = RegisterSchema.parse(req.body)
    const result = await register(body.username, body.password)
    reply.setCookie('refresh_token', result.rawRefreshToken, refreshCookieOptions())
    return reply.code(201).send({ accessToken: result.accessToken })
  } catch (err) {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Bad Request' })
    }
    if (err instanceof AuthServiceError) {
      return reply
        .code(err.statusCode)
        .send({ code: err.code, error: err.message })
    }
    throw err
  }
}

/**
 * POST /auth/login
 *
 * <p><b>Logic:</b> Validates login credentials, authenticates via the auth service, sets the refresh token in an HTTP-only cookie, and responds with the short-lived access token.</p>
 * <p><b>Security:</b> Prevents timing attacks and logs failed attempts. Protects the refresh token by keeping it out of JS context (HttpOnly cookie).</p>
 * <p><b>Efficiency:</b> Fast path for valid credentials, avoids DB hits for known compromised tokens or locked accounts.</p>
 */
export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const body = LoginSchema.parse(req.body)
    const result = await login(body.identifier, body.password, req.log)
    reply.setCookie('refresh_token', result.rawRefreshToken, refreshCookieOptions())
    return reply.code(200).send({ accessToken: result.accessToken })
  } catch (err) {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Bad Request' })
    }
    if (err instanceof AuthServiceError) {
      return reply
        .code(err.statusCode)
        .send({ code: err.code, error: err.message })
    }
    throw err
  }
}

/**
 * POST /auth/refresh
 *
 * <p><b>Logic:</b> Extracts the signed refresh token from cookies, delegates token rotation to the auth service, and issues a new token pair.</p>
 * <p><b>Security:</b> Requires a cryptographically signed cookie. Mitigates token reuse through strict rotation logic and family revocation.</p>
 * <p><b>Efficiency:</b> Validates cookie signature directly in Fastify before hitting the database, rejecting invalid requests early.</p>
 */
export async function refreshHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const raw = getSignedRefreshToken(req)
    if (!raw) {
      return reply.code(401).send({ code: 'UNAUTHORIZED', error: 'unauthorized' })
    }

    const result = await rotateRefreshToken(raw, req.log)
    reply.setCookie('refresh_token', result.rawRefreshToken, refreshCookieOptions())
    return reply.code(200).send({ accessToken: result.accessToken })
  } catch (err) {
    if (err instanceof AuthServiceError) {
      return reply
        .code(err.statusCode)
        .send({ code: err.code, error: err.message })
    }
    throw err
  }
}

/**
 * POST /auth/logout
 *
 * <p><b>Logic:</b> Extracts the refresh token, instructs the auth service to revoke it, and clears the client's cookie.</p>
 * <p><b>Security:</b> Invalidates the session on the server side and ensures the client's token is wiped. Access tokens may remain valid until natural expiration.</p>
 * <p><b>Efficiency:</b> Fire-and-forget style client response while the server finalizes database revocation.</p>
 */
export async function logoutHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const raw = getSignedRefreshToken(req)
    if (raw) {
      await logout(raw)
    }
    reply.clearCookie('refresh_token', { path: '/auth/refresh', signed: true })
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof AuthServiceError) {
      return reply
        .code(err.statusCode)
        .send({ code: err.code, error: err.message })
    }
    throw err
  }
}

/**
 * GET /auth/jwks.json
 *
 * <p><b>Logic:</b> Exposes the public keys used for JWT verification so other services (like the Spring Boot backend) can validate access tokens.</p>
 * <p><b>Security:</b> Only exposes the public exponent and modulus. Keys are strictly for verification, keeping private keys securely isolated in this service.</p>
 * <p><b>Efficiency:</b> Heavily caches the response (`Cache-Control: public, max-age=3600`) to minimize load and network latency for verifying services.</p>
 */
export async function jwksHandler(_req: FastifyRequest, reply: FastifyReply) {
  const jwks = await buildJwks()
  reply.header('Cache-Control', 'public, max-age=3600')
  return reply.code(200).send(jwks)
}


