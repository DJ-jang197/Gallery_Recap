// Simple browser-side login wiring for the hosted /login page.
const keyInput = document.getElementById('securityKey')
const toggleKeyBtn = document.getElementById('toggleKey')
const loginForm = document.getElementById('loginForm')
const identifierInput = document.getElementById('identifier')
const statusEl = document.getElementById('loginStatus')
const burstBackdrop = document.querySelector('.key-burst-backdrop')
const pageEl = document.querySelector('.page')

// Track last input value to detect only new characters
let lastIdentifierValue = ''

const MAX_BURST_ELEMENTS = 50
const BURST_DURATION_MS = 3600

// Toggles screen dimming when sensitive input is active.
function setPasswordPrivacy(enabled) {
  if (!pageEl) return
  pageEl.classList.toggle('password-privacy', enabled)
}

keyInput?.addEventListener('focus', () => setPasswordPrivacy(true))
keyInput?.addEventListener('blur', () => {
  setPasswordPrivacy(Boolean(keyInput?.value))
})
keyInput?.addEventListener('input', () => {
  setPasswordPrivacy(Boolean(keyInput?.value))
})

toggleKeyBtn?.addEventListener('click', () => {
  if (!keyInput) return
  keyInput.type = keyInput.type === 'password' ? 'text' : 'password'
})

// Submits credentials to the backend and routes to the Siel app on success.
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault()

  const identifier = identifierInput?.value?.trim() ?? ''
  const password = keyInput?.value ?? ''
  if (!identifier || !password) {
    if (statusEl) statusEl.textContent = 'Enter both username and security key.'
    return
  }

  if (statusEl) statusEl.textContent = 'Signing in...'

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (statusEl) statusEl.textContent = body?.error ?? 'Login failed.'
      return
    }

    if (body?.accessToken) {
      sessionStorage.setItem('accessToken', body.accessToken)
    }
    if (statusEl) statusEl.textContent = 'Login successful. Redirecting...'
    window.location.assign('http://localhost:5173/')
  } catch {
    if (statusEl) statusEl.textContent = 'Network error. Try again.'
  }
})

const params = new URLSearchParams(window.location.search)
if (params.get('created') === '1' && statusEl) {
  statusEl.textContent = 'Account created successfully! Please log in.'
}

// --- Key Burst Animation ---
// Spawns floating letters around center to visualize typed characters.
function createBurst(letter) {
  if (!burstBackdrop || !letter || !/[a-zA-Z]/.test(letter)) return

  const count = 6 + Math.floor(Math.random() * 4) // 6-9 letters
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span')
    span.className = 'burst-letter'
    span.textContent = letter.toLowerCase()

    // Random position within viewport center area
    const angle = Math.random() * Math.PI * 2
    const distance = 42 + Math.random() * 110
    const left = centerX + Math.cos(angle) * distance
    const top = centerY + Math.sin(angle) * distance

    // Random drift direction for animation
    const driftAngle = Math.random() * Math.PI * 2
    const driftDistance = 220 + Math.random() * 220
    const driftX = Math.cos(driftAngle) * driftDistance
    const driftY = Math.sin(driftAngle) * driftDistance

    // Random rotation
    const rotation = (Math.random() - 0.5) * 120

    span.style.left = `${left}px`
    span.style.top = `${top}px`
    span.style.setProperty('--drift-x', `${driftX}px`)
    span.style.setProperty('--drift-y', `${driftY}px`)
    span.style.setProperty('--rotation', `${rotation}deg`)
    span.style.animationDelay = `${Math.random() * 12}ms`

    burstBackdrop.appendChild(span)
    // Clean up after animation
    setTimeout(() => span.remove(), BURST_DURATION_MS + 220)
  }

  // Enforce element limit
  const existing = burstBackdrop.querySelectorAll('.burst-letter')
  if (existing.length > MAX_BURST_ELEMENTS) {
    const toRemove = existing.length - MAX_BURST_ELEMENTS
    for (let i = 0; i < toRemove; i++) {
      existing[i].remove()
    }
  }
}

// Listen for new characters in identifier input
// Emits bursts only for newly-added characters.
identifierInput?.addEventListener('input', (e) => {
  const newValue = e.target.value || ''
  
  // Find the new character(s) added
  const oldLen = lastIdentifierValue.length
  const newLen = newValue.length
  const addedChars = newLen > oldLen ? newValue.slice(oldLen) : ''
  
  if (addedChars) {
    for (const char of addedChars) {
      createBurst(char)
    }
  }

  lastIdentifierValue = newValue
})

