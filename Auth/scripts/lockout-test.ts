const base = 'http://localhost:3000'

async function post(path: string, body: any, headers?: Record<string, string>) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, text }
}

const email = `victim_${Date.now()}@test.com`
const password = 'Str0ng!Password12'

// best-effort: register once
await post('/auth/register', { email, password })

for (let i = 1; i <= 11; i++) {
  const ip = `9.9.9.${i}`
  const r = await post(
    '/auth/login',
    { email, password: 'Wrong!Password12' },
    { 'X-Forwarded-For': ip },
  )
  process.stdout.write(`${i}: status=${r.status} body=${r.text}\n`)
}

