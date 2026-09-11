export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 100
export const VERIFICATION_CODE_LENGTH = 6

export function validateRegistrationPasswords(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must contain no more than ${PASSWORD_MAX_LENGTH} characters.`
  }

  if (password !== confirmation) {
    return 'Your passwords do not match.'
  }

  return null
}
