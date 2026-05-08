import { buildApp } from './app.js'
import { env } from './config/env.js'
import { redis } from './config/redis.js'

const app = buildApp()

// Network binding config for the HTTP service.
const port = env.PORT
const host = '0.0.0.0'

// Startup hard-check: fail fast if Redis is unreachable.
try {
  await redis.ping()
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Bind HTTP server only after required dependencies are healthy.
app.listen({ port, host }).catch((err: unknown) => {
  app.log.error(err)
  process.exit(1)
})


