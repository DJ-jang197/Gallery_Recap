import type { FastifyReply, FastifyRequest } from 'fastify'
import { jwtVerify, type JWTPayload } from 'jose'
import { publicKey } from '../config/keys.js'
import { isAccessTokenRevoked } from '../services/token.service.js'

export type VerifiedToken = JWTPayload & { jti: string }

// Bearer token verification + Redis blocklist check middleware.
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  const token = auth.slice('Bearer '.length)

  let payload: JWTPayload
  try {
    // Verify JWT signature + standard claims.
    const verified = await jwtVerify(token, await publicKey)
    payload = verified.payload
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  const jti = payload.jti
  const exp = payload.exp
  if (typeof jti !== 'string' || typeof exp !== 'number') {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  const remainingTtlSeconds = Math.ceil(exp - Date.now() / 1000)
  if (remainingTtlSeconds <= 0) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  try {
    // Reject tokens that have been explicitly revoked before expiry.
    const revoked = await isAccessTokenRevoked(jti)
    if (revoked) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  } catch {
    return reply.code(503).send({ error: 'Service Unavailable' })
  }

  ;(req as any).auth = payload as VerifiedToken
}

