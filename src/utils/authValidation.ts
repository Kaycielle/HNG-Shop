/** Friendly checks for the sign-in and create-account forms. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const PASSWORD_MIN = 8

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Please enter your email address.'
  if (!EMAIL_PATTERN.test(value.trim())) return 'Please enter a valid email address, like name@example.com.'
}

export function validateName(value: string): string | undefined {
  const v = value.trim()
  if (!v) return 'Please enter your full name.'
  if (v.length < 2) return 'Your name should be at least 2 characters.'
  if (v.length > 80) return 'Your name should be 80 characters or fewer.'
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Please choose a password.'
  if (value.length < PASSWORD_MIN) return `Your password needs at least ${PASSWORD_MIN} characters.`
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Your password needs at least one letter and one number.'
}

export function validateConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Please type your password again.'
  if (password !== confirm) return 'The two passwords don’t match.'
}
