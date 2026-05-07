const base = 'http://localhost:3000'
const email = `reuse_${Date.now()}@test.com`
const password = 'Str0ng!Password12'

async function post(
  path: string,
  body: unknown,
  cookie?: string,
): Promise<{ status: number; body: string; setCookie: string | null }> {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
  return {
    status: res.status,
    body: await res.text(),
    setCookie: res.headers.get('set-cookie'),
  }
}

await post('/auth/register', { email, password })
const loginRes = await post('/auth/login', { email, password })
const initialSetCookie = loginRes.setCookie
if (!initialSetCookie) {
  throw new Error('missing refresh cookie on login')
}
const originalCookie = initialSetCookie.split(';')[0]

const refresh1 = await post('/auth/refresh', {}, originalCookie)
const refresh2 = await post('/auth/refresh', {}, originalCookie)

process.stdout.write(`refresh1_status=${refresh1.status}\n`)
process.stdout.write(`refresh2_status=${refresh2.status}\n`)
process.stdout.write(`refresh2_body=${refresh2.body}\n`)

