import type { RoleCode } from '@swefton/shared/auth'
import type { FacilityCategory, GymResponse } from '@swefton/shared/onboarding'
import { httpClient } from '../../../core/http/httpClient'

interface AuthDestinationResponse {
  role: RoleCode
  onboardingCompleted: boolean
  facilityId: number | null
  category: FacilityCategory | null
}

export const businessRoutingApi = {
  async getDestination() {
    const { data } = await httpClient.get<AuthDestinationResponse>('/auth/destination')
    return data
  },

  async getGymByFacility(facilityId: number) {
    const { data } = await httpClient.get<GymResponse>(`/gyms/facility/${facilityId}`)
    return data
  },
}
