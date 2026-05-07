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
  const registerRateLimit =
    env.NODE_ENV === 'production'
      ? { max: 5, timeWindow: '1 hour', keyGenerator: (req: any) => req.ip }
      : { max: 50, timeWindow: '15 min', keyGenerator: (req: any) => req.ip }

  app.post(
    '/register',
    {
      config: {
        rateLimit: registerRateLimit,
      },
    },
    registerHandler,
  )
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
  app.post(
    '/refresh',
    {
      config: {
        rateLimit: { max: 30, timeWindow: '15 min', keyGenerator: (req) => req.ip },
      },
    },
    refreshHandler,
  )
  app.post(
    '/logout',
    {
      config: {
        rateLimit: { max: 20, timeWindow: '15 min', keyGenerator: (req) => req.ip },
      },
    },
    logoutHandler,
  )
  app.get('/jwks.json', jwksHandler)

  app.get(
    '/me',
    { preHandler: requireAuth },
    async (req) => ({ user: (req as any).auth ?? null }),
  )
}


