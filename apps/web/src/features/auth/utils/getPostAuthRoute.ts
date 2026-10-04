import {
  getPostAuthDestination,
  type AuthResponse,
  type PostAuthDestination,
} from '@swefton/shared/auth'
import type { FacilityCategory } from '@swefton/shared/onboarding'
import { activeBusinessStorage } from '../../../core/storage/activeBusinessStorage'
import { businessRoutingApi } from '../api/businessRoutingApi'

const webRoutes: Record<PostAuthDestination, string> = {
  'member-onboarding': '/onboarding/user',
  'trainer-onboarding': '/onboarding/trainer',
  'business-onboarding': '/onboarding/facility',
  'staff-onboarding': '/onboarding/staff',
  dashboard: '/userDashboard',
}

export function getPostAuthRoute(auth: AuthResponse): string {
  if (auth.role === 'ADMIN') {
    return '/userDashboard'
  }
  if (auth.onboardingCompleted && auth.role === 'FACILITY_OWNER') {
    return '/gymDashboard'
  }
  return webRoutes[getPostAuthDestination(auth)]
}

const openFacilityDashboard = async (
  facilityId: number,
  persistent: boolean,
) => {
  const gym = await businessRoutingApi.getGymByFacility(facilityId)
  activeBusinessStorage.save(
    { id: gym.id, category: gym.category },
    persistent,
  )
  return '/gymDashboard'
}

const facilityCategoryHandlers: Record<FacilityCategory, typeof openFacilityDashboard> = {
  GYM: openFacilityDashboard,
  SWIMMING: openFacilityDashboard,
  BOXING: openFacilityDashboard,
  MARTIAL_ARTS: openFacilityDashboard,
  YOGA: openFacilityDashboard,
  CROSSFIT: openFacilityDashboard,
}

export async function getPostLoginRoute(
  auth: AuthResponse,
  persistent: boolean,
): Promise<string> {
  const destination = await businessRoutingApi.getDestination()

  if (destination.role === 'FACILITY_OWNER') {
    if (!destination.facilityId || !destination.category) return '/onboarding/facility'

    const handler = facilityCategoryHandlers[destination.category]
    if (!handler) throw new Error(`Unsupported facility category: ${destination.category}`)
    return handler(destination.facilityId, persistent)
  }

  return getPostAuthRoute({
    ...auth,
    role: destination.role,
    onboardingCompleted: destination.onboardingCompleted,
  })
}
