import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'

// Global error handler: generic responses in production, detailed in non-prod.
export function errorHandler(
  err: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  req.log.error(err)

  const statusCode = err.statusCode ?? 500

  if (env.NODE_ENV === 'production') {
    if (statusCode >= 500) {
      return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error' })
    }
    // Client errors: keep generic, no internals.
    if (statusCode === 400) {
      return reply.code(400).send({ error: 'Bad Request' })
    }
    if (statusCode === 401) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
    if (statusCode === 403) {
      return reply.code(403).send({ error: 'Forbidden' })
    }
    if (statusCode === 404) {
      return reply.code(404).send({ error: 'Not Found' })
    }
    if (statusCode === 429) {
      return reply.code(429).send({ error: 'Too Many Requests' })
    }
    return reply.code(statusCode).send({ error: 'Error' })
  }

  // DEVELOPMENT ONLY: Send detailed error information to aid debugging.
  // CRITICAL: Ensure NODE_ENV is set to 'production' in all deployed environments 
  // to prevent leaking internal system details via err.message and err.code.
  return reply.code(statusCode).send({
    statusCode,
    error: err.name,
    message: err.message,
    code: (err as any).code,
  })
}


