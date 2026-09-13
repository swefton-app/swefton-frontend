import type { RoleCode, TokenResponse } from '@swefton/shared/auth'

const ACCESS_TOKEN_KEY = 'swefton.accessToken'
const REFRESH_TOKEN_KEY = 'swefton.refreshToken'
const ROLE_CODES: readonly RoleCode[] = [
  'USER',
  'TRAINER',
  'FACILITY_OWNER',
  'ADMIN',
]

interface AccessTokenClaims {
  role?: unknown
}

function readAccessTokenClaims(): AccessTokenClaims | null {
  const token = getToken(ACCESS_TOKEN_KEY)
  const payload = token?.split('.')[1]
  if (!payload) return null

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as AccessTokenClaims
  } catch {
    return null
  }
}

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
  getRole(): RoleCode | null {
    const role = readAccessTokenClaims()?.role
    return typeof role === 'string' && ROLE_CODES.includes(role as RoleCode)
      ? (role as RoleCode)
      : null
  },

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
