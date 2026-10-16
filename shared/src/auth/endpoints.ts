export const authEndpoints = {
  login: '/auth/login',
  register: '/auth/register',
  refresh: '/auth/refresh',
  verifyEmail: '/auth/verify-email',
  resendVerificationCode: '/auth/resend-verification-code',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  changePassword: '/auth/change-password',
  google: '/auth/google',
  logout: '/auth/logout',
} as const

export const publicAuthEndpoints = [
  authEndpoints.login,
  authEndpoints.register,
  authEndpoints.refresh,
  authEndpoints.verifyEmail,
  authEndpoints.resendVerificationCode,
  authEndpoints.forgotPassword,
  authEndpoints.resetPassword,
  authEndpoints.google,
  '/public/staff-invitations',
] as const
