import pg from 'pg'
import { env } from './env.js'

// Shared Postgres connection pool.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
})


