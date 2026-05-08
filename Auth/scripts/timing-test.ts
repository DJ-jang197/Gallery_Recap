const base = 'http://localhost:3000'

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  // Measures full request latency for timing-attack regression checks.
  const start = performance.now()
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    body: JSON.stringify(body),
  })
  await res.text()
  return performance.now() - start
}

const email = `timing_${Date.now()}@test.com`
const password = 'Str0ng!Password12'
await post('/auth/register', { email, password })

const nonexistentTimes: number[] = []
for (let i = 0; i < 10; i++) {
  nonexistentTimes.push(
    await post('/auth/login', {
      email: `none_${Date.now()}_${i}@test.com`,
      password: 'Wrong!Password12',
    }),
  )
}

const wrongPasswordTimes: number[] = []
for (let i = 0; i < 10; i++) {
  wrongPasswordTimes.push(
    await post('/auth/login', {
      email,
      password: 'Wrong!Password12',
    }),
  )
}

const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
const meanNone = mean(nonexistentTimes)
const meanWrong = mean(wrongPasswordTimes)
const diff = Math.abs(meanNone - meanWrong)

process.stdout.write(`mean_nonexistent_ms=${meanNone.toFixed(2)}\n`)
process.stdout.write(`mean_wrong_password_ms=${meanWrong.toFixed(2)}\n`)
process.stdout.write(`diff_ms=${diff.toFixed(2)}\n`)

