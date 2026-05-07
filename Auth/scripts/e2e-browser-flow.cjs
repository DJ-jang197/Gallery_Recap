const { chromium, request } = require('playwright')

;(async () => {
  const baseUrl = 'http://localhost:3000'
  const username = `e2e_${Date.now()}`
  const password = 'Str0ng!Password12'

  const api = await request.newContext({ baseURL: baseUrl })
  const regRes = await api.post('/auth/register', {
    data: { username, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (![201, 409].includes(regRes.status())) {
    throw new Error(`Register failed: ${regRes.status()} ${await regRes.text()}`)
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`${baseUrl}/login`)
  await page.fill('#identifier', username)
  await page.fill('#securityKey', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/success', { timeout: 5000 })
  const successText = await page.locator('body').innerText()
  if (!successText.includes('Login successful; Auth system successful.')) {
    throw new Error('Did not reach success page content')
  }

  console.log('E2E browser flow PASS')
  await browser.close()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})

