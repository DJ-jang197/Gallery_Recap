import { jwtVerify } from 'jose'
import { publicKey } from '../src/config/keys.js'
import { revokeAccessToken, signAccessToken } from '../src/services/token.service.js'

const token = await signAccessToken(
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
)

const { payload } = await jwtVerify(token, await publicKey)
const jti = String(payload.jti)
const exp = Number(payload.exp)

const remainingTtlSeconds = Math.ceil(exp - Date.now() / 1000)
await revokeAccessToken(jti, remainingTtlSeconds)

const res = await fetch('http://localhost:3000/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})

process.stdout.write(`jti=${jti}\n`)
process.stdout.write(`status=${res.status}\n`)

