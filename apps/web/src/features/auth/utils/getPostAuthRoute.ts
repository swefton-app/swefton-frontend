import {
  getPostAuthDestination,
  type AuthResponse,
  type PostAuthDestination,
} from '@swefton/shared/auth'

const webRoutes: Record<PostAuthDestination, string> = {
  'member-onboarding': '/onboarding/user',
  'trainer-onboarding': '/onboarding/trainer',
  'business-onboarding': '/onboarding/facility',
  dashboard: '/userDashboard',
}

export function getPostAuthRoute(auth: AuthResponse): string {
  return webRoutes[getPostAuthDestination(auth)]
}
