import { z } from 'zod'

// Registration/login payload policy.
export const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9._@-]+$/),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/),
})

export const LoginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

// Normalize email for all comparisons and lookups.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

// Reject passwords containing email local-part (e.g., name@...).
export function passwordContainsEmailLocalPart(
  email: string,
  password: string,
): boolean {
  const local = normalizeEmail(email).split('@')[0] ?? ''
  if (!local) return false
  return password.toLowerCase().includes(local)
}


