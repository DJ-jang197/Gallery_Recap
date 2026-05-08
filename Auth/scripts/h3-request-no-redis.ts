// Smoke test: call /auth/me with a signed token without touching Redis helpers.
import crypto from 'crypto'
import { SignJWT } from 'jose'
import { privateKey } from '../src/config/keys.js'

const token = await new SignJWT({
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  jti: crypto.randomUUID(),
})
  .setProtectedHeader({ alg: 'RS256' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(await privateKey)

const res = await fetch('http://localhost:3000/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})

process.stdout.write(`status=${res.status}\n`)
process.stdout.write(`${await res.text()}\n`)

