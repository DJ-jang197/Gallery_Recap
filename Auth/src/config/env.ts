import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment values before validation.
dotenv.config()

const EnvSchema = z.object({
  // Postgres connection string used by DAL + migration scripts.
  DATABASE_URL: z.string().min(1),
  // Redis endpoint used for lockout counters + token blocklist.
  REDIS_URL: z.string().min(1),
  // Cookie signing secret (must be long random data).
  COOKIE_SECRET: z.string().min(32),
  // Runtime mode controls error verbosity and security behavior.
  NODE_ENV: z.enum(['development', 'test', 'production']),
  // HTTP port for Fastify auth service.
  PORT: z.coerce.number().int().positive().default(3000),
  // Allowed frontend origin for CORS.
  CLIENT_URL: z.string().min(1),
})

export const env = EnvSchema.parse(process.env)


