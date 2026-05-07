import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment values before validation.
dotenv.config()

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  COOKIE_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_URL: z.string().min(1),
})

export const env = EnvSchema.parse(process.env)


