import { generateKeyPairSync } from 'crypto'
import fs from 'fs'
import path from 'path'

// One-time local key generation script (never run at server boot).
const keysDir = path.resolve(process.cwd(), 'keys')
const privateKeyPath = path.join(keysDir, 'private.pem')
const publicKeyPath = path.join(keysDir, 'public.pem')

fs.mkdirSync(keysDir, { recursive: true })

// Generate RSA keypair used by RS256 JWT signing/verification.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const publicPem = publicKey.export({ type: 'spki', format: 'pem' })

// Persist key material with least-privilege filesystem modes.
fs.writeFileSync(privateKeyPath, privatePem, { encoding: 'utf8', mode: 0o600 })
fs.writeFileSync(publicKeyPath, publicPem, { encoding: 'utf8', mode: 0o644 })

try {
  fs.chmodSync(privateKeyPath, 0o600)
  fs.chmodSync(publicKeyPath, 0o644)
} catch {
  // Best-effort on non-POSIX filesystems.
}

process.stdout.write(`wrote ${privateKeyPath}\n`)
process.stdout.write(`wrote ${publicKeyPath}\n`)


