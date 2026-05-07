import fs from 'fs'
import path from 'path'
import { importPKCS8, importSPKI } from 'jose'

// Strict file loader that fails with actionable messages.
function mustReadFile(filePath: string, missingMessage: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(missingMessage)
    }
    throw err
  }
}

const keysDir = path.resolve(process.cwd(), 'keys')
const privatePemPath = path.join(keysDir, 'private.pem')
const publicPemPath = path.join(keysDir, 'public.pem')

const privatePem = mustReadFile(
  privatePemPath,
  'keys/private.pem not found — run scripts/gen-keys.ts',
)
const publicPem = mustReadFile(
  publicPemPath,
  'keys/public.pem not found — run scripts/gen-keys.ts',
)

export const privateKey = importPKCS8(privatePem, 'RS256')
export const publicKey = importSPKI(publicPem, 'RS256')


