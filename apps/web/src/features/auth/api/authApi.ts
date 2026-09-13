import type {
  AuthApi,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
} from '@swefton/shared/auth'
import { authEndpoints } from '@swefton/shared/auth'
import { httpClient } from '../../../core/http/httpClient'

export const authApi: AuthApi = {
  async login(payload: LoginRequest) {
    const { data } = await httpClient.post<AuthResponse>(authEndpoints.login, payload)
    return data
  },

  async register(payload: RegisterRequest) {
    const { data } = await httpClient.post<RegisterResponse>(
      authEndpoints.register,
      payload,
    )
    return data
  },

  async verifyEmail(payload: VerifyEmailRequest) {
    await httpClient.post(authEndpoints.verifyEmail, payload)
  },

  async resendVerificationCode(email: string) {
    await httpClient.post(authEndpoints.resendVerificationCode, { email })
  },

  async logout() {
    await httpClient.post(authEndpoints.logout)
  },
}
