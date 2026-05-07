const base = 'http://localhost:3000'

for (let i = 1; i <= 6; i++) {
  const res = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `rl_${Date.now()}_${i}@test.com`,
      password: 'Str0ng!Password12',
    }),
  })
  process.stdout.write(`${i}: status=${res.status}\n`)
}

