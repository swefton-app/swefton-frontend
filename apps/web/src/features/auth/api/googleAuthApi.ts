import {
  authEndpoints,
  type AuthResponse,
  type RoleCode,
} from '@swefton/shared/auth'
import { config } from '../../../config'

export async function authenticateWithGoogle(
  credential: string,
  role?: RoleCode,
): Promise<AuthResponse> {
  const response = await fetch(`${config.apiUrl}${authEndpoints.google}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, role }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Google authentication failed')
  }

  return response.json() as Promise<AuthResponse>
}
