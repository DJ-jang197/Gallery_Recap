import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose'
import crypto from 'crypto'
import { privateKey } from '../src/config/keys.js'

const token = await new SignJWT({
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'jwks@test.com',
  jti: crypto.randomUUID(),
})
  .setProtectedHeader({ alg: 'RS256' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(await privateKey)

const jwks = createRemoteJWKSet(new URL('http://localhost:3000/auth/jwks.json'))
await jwtVerify(token, jwks)
process.stdout.write('jwks verify PASS\n')

