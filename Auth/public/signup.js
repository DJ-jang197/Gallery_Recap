// Browser-side signup flow with friendly validation.
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const togglePasswordBtn = document.getElementById('togglePassword')
const signupForm = document.getElementById('signupForm')
const statusEl = document.getElementById('signupStatus')
const hintEl = document.getElementById('passwordHint')
const burstBackdrop = document.querySelector('.key-burst-backdrop')
const pageEl = document.querySelector('.page')

// Track last input value to detect only new characters
let lastUsernameValue = ''

const MAX_BURST_ELEMENTS = 50
const BURST_DURATION_MS = 3600

// Toggles screen dimming while password input is active.
function setPasswordPrivacy(enabled) {
  if (!pageEl) return
  pageEl.classList.toggle('password-privacy', enabled)
}

// Applies client-side password policy checks before submit.
function checkPasswordStrength(value) {
  const hasMinLen = value.length >= 12
  const hasNumber = /[0-9]/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasSpecial = /[^a-zA-Z0-9]/.test(value)
  return hasMinLen && hasNumber && hasUpper && hasSpecial
}

passwordInput?.addEventListener('input', () => {
  const value = passwordInput.value
  setPasswordPrivacy(Boolean(value))
  if (!value) {
    hintEl.textContent = ''
    return
  }
  if (checkPasswordStrength(value)) {
    hintEl.textContent = 'Password baseline check passed.'
  } else {
    hintEl.textContent =
      'Use at least 12 chars, 1 uppercase, 1 number, and 1 special character.'
  }
})

togglePasswordBtn?.addEventListener('click', () => {
  if (!passwordInput) return
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password'
})

passwordInput?.addEventListener('focus', () => setPasswordPrivacy(true))
passwordInput?.addEventListener('blur', () => {
  setPasswordPrivacy(Boolean(passwordInput?.value))
})

// Creates an account and forwards user back to login on success.
signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const username = usernameInput?.value?.trim().toLowerCase() ?? ''
  const password = passwordInput?.value ?? ''

  if (!username || !password) {
    statusEl.textContent = 'Enter a username and password.'
    return
  }
  if (!/^[a-z0-9._@-]+$/.test(username)) {
    statusEl.textContent = 'Use only letters, numbers, dot, underscore, hyphen, or @.'
    return
  }
  if (!checkPasswordStrength(password)) {
    statusEl.textContent =
      'Password must be 12+ chars with uppercase, number, and special character.'
    return
  }

  statusEl.textContent = 'Creating account...'

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (res.status === 409) {
        statusEl.textContent = 'Username is already taken.'
        return
      }
      statusEl.textContent = body?.error ?? 'Sign up failed.'
      return
    }

    window.location.assign('/login?created=1')
  } catch {
    statusEl.textContent = 'Network error. Try again.'
  }
})

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

// Listen for new characters in username input
// Emits bursts only for newly-added characters.
usernameInput?.addEventListener('input', (e) => {
  const newValue = e.target.value || ''
  
  // Find the new character(s) added
  const oldLen = lastUsernameValue.length
  const newLen = newValue.length
  const addedChars = newLen > oldLen ? newValue.slice(oldLen) : ''
  
  if (addedChars) {
    for (const char of addedChars) {
      createBurst(char)
    }
  }

  lastUsernameValue = newValue
})

