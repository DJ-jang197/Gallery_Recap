import type { FastifyPluginAsync } from 'fastify'
import { env } from '../config/env.js'
import {
  jwksHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'

// Route module for all authentication endpoints.
export const authRoutes: FastifyPluginAsync = async (app) => {
  // Relaxed local limits for development; stricter caps in production.
  const registerRateLimit =
    env.NODE_ENV === 'production'
      ? { max: 5, timeWindow: '1 hour', keyGenerator: (req: any) => req.ip }
      : { max: 50, timeWindow: '15 min', keyGenerator: (req: any) => req.ip }

  // Creates new user account and initial token pair.
  app.post(
    '/register',
    {
      config: {
        rateLimit: registerRateLimit,
      },
    },
    registerHandler,
  )
  // Authenticates username/email + password.
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 min',
          keyGenerator: (req) => req.ip + ':' + ((req.body as any)?.identifier ?? ''),
        },
      },
    },
    loginHandler,
  )
  // Rotates refresh token and issues a fresh access token.
  app.post(
    '/refresh',
    {
      config: {
        rateLimit: { max: 30, timeWindow: '15 min', keyGenerator: (req) => req.ip },
      },
    },
    refreshHandler,
  )
  // Revokes current refresh session.
  app.post(
    '/logout',
    {
      config: {
        rateLimit: { max: 20, timeWindow: '15 min', keyGenerator: (req) => req.ip },
      },
    },
    logoutHandler,
  )
  // Publishes public keys for downstream JWT verification.
  app.get('/jwks.json', jwksHandler)

  // Debug/profile endpoint for currently authenticated user claims.
  app.get(
    '/me',
    { preHandler: requireAuth },
    async (req) => ({ user: (req as any).auth ?? null }),
  )
}


