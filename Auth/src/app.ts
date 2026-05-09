import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'
import { authRoutes } from './routes/auth.routes.js'
import { errorHandler } from './middleware/error.js'

export function buildApp(): FastifyInstance {
  // Base Fastify instance with strict body limits and reverse-proxy awareness.
  const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 4096 })
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // Signed cookies are required for secure refresh token storage.
  app.register(cookie, { secret: env.COOKIE_SECRET })

  // Route-level rate limits are defined on auth routes.
  app.register(rateLimit, {
    global: false,
    hook: 'preHandler',
    onExceeded: (req, key) => {
      req.log.warn({ event: 'RATE_LIMIT', key, ip: req.ip, url: req.url })
    },
  })

  // Secure default headers + anti-clickjacking response policy.
  app.register(helmet, { frameguard: { action: 'deny' } })
  // Allow authenticated browser requests from the Siel frontend origin.
  app.register(cors, { origin: [env.CLIENT_URL], credentials: true })

  // Centralized error normalization.
  app.setErrorHandler(errorHandler)

  // Serve local static frontend pages.
  app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  })

  // NOTE: Previously served user assets from a hardcoded local path.
  // Removed for security — hardcoded filesystem paths expose machine structure
  // and break portability. Place any UI assets in Auth/public/ instead.

  // Hosted auth UI entry point.
  app.get('/login', async (_, reply) => {
    return reply.sendFile('login.html')
  })
  // Hosted signup page entry point.
  app.get('/signup', async (_, reply) => {
    return reply.sendFile('signup.html')
  })
  // Optional helper content for onboarding/registration support.
  app.get('/auth/register-help', async (_, reply) => {
    return reply.sendFile('register-help.html')
  })
  // Post-login success page (UI-only route).
  app.get('/success', async (_, reply) => {
    return reply.sendFile('success.html')
  })

  // Main auth API routes.
  app.register(authRoutes, { prefix: '/auth' })

  app.addHook('onReady', async () => {
    app.log.info('server ready')
  })

  return app
}


