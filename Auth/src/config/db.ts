import pg from 'pg'
import { env } from './env.js'

// Shared Postgres connection pool.
export const pool = new pg.Pool({
  // Single source of truth for DB connectivity across DAL modules.
  connectionString: env.DATABASE_URL,
})


