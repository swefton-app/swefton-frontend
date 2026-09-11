import type { AuthResponse } from './contracts'

export type PostAuthDestination =
  | 'member-onboarding'
  | 'trainer-onboarding'
  | 'business-onboarding'
  | 'dashboard'

export function getPostAuthDestination(
  auth: Pick<AuthResponse, 'onboardingCompleted' | 'role'>,
): PostAuthDestination {
  if (auth.onboardingCompleted) return 'dashboard'

  switch (auth.role) {
    case 'TRAINER':
      return 'trainer-onboarding'
    case 'FACILITY_OWNER':
      return 'business-onboarding'
    default:
      return 'member-onboarding'
  }
}
