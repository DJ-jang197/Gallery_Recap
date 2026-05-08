import { Redis } from 'ioredis'
import { env } from './env.js'

// Shared Redis client used for lockout + token blocklist.
export const redis = new Redis(env.REDIS_URL, {
  // Connect at startup to surface infra issues immediately.
  lazyConnect: false,
  // Fail fast per request instead of hanging indefinitely.
  maxRetriesPerRequest: 1,
})

redis.on('error', (err: unknown) => {
  // Logged; startup connectivity is enforced in src/server.ts before binding.
  // eslint-disable-next-line no-console
  console.error(err)
})


