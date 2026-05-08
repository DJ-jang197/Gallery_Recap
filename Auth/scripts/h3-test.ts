// Smoke test: generate a local access token and call /auth/me.
import { signAccessToken } from '../src/services/token.service.js'

const token = await signAccessToken(
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
)

const res = await fetch('http://localhost:3000/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})

process.stdout.write(`status=${res.status}\n`)
process.stdout.write(`${await res.text()}\n`)

