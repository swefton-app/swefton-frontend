import type { TokenResponse } from '@swefton/shared/auth'

const ACCESS_TOKEN_KEY = 'swefton.accessToken'
const REFRESH_TOKEN_KEY = 'swefton.refreshToken'

const getToken = (key: string) =>
  sessionStorage.getItem(key) ?? localStorage.getItem(key)

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const tokenStorage = {
  getAccessToken: () => getToken(ACCESS_TOKEN_KEY),
  getRefreshToken: () => getToken(REFRESH_TOKEN_KEY),

  save(
    tokens: Pick<TokenResponse, 'accessToken' | 'refreshToken'>,
    persistent = localStorage.getItem(REFRESH_TOKEN_KEY) !== null,
  ) {
    const storage = persistent ? localStorage : sessionStorage
    clearTokens()
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  },

  clear: clearTokens,
}
