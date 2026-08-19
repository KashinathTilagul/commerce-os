export function validateNewPassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer'
  }
  return null
}
