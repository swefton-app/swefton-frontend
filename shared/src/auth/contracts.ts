export type RoleCode = 'USER' | 'TRAINER' | 'FACILITY_OWNER' | 'STAFF' | 'ADMIN'

export type UserRole = Exclude<RoleCode, 'ADMIN' | 'STAFF'>

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  role: UserRole
}

export interface RegisterResponse {
  id: number
  email: string
  role: UserRole
  emailConfirmed: boolean
}

export interface TokenResponse {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresIn: number
  refreshToken: string
  refreshTokenExpiresIn: number
}

export interface AuthResponse extends TokenResponse {
  userId: number
  email: string
  role: RoleCode
  newUser: boolean
  onboardingCompleted: boolean
}

export interface VerifyEmailRequest {
  email: string
  code: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface AuthApi {
  login(payload: LoginRequest): Promise<AuthResponse>
  register(payload: RegisterRequest): Promise<RegisterResponse>
  verifyEmail(payload: VerifyEmailRequest): Promise<void>
  resendVerificationCode(email: string): Promise<void>
  forgotPassword(email: string): Promise<void>
  resetPassword(payload: ResetPasswordRequest): Promise<void>
  changePassword(payload: ChangePasswordRequest): Promise<void>
  logout(): Promise<void>
}
