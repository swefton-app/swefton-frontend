import {
  membershipEndpoints,
  type AccessPassResponse,
  type AccessValidationResponse,
  type GymDirectoryProfileResponse,
  type GymDirectorySummaryResponse,
  type GymMembershipResponse,
  type MembershipPlanResponse,
  type MembershipPlanRequest,
  type CardPaymentRequest,
  type PriceOfferResponse,
} from '@swefton/shared/membership'
import type { ImageResponse } from '@swefton/shared/onboarding'
import { config } from '../../../config'
import { httpClient } from '../../../core/http/httpClient'

export interface MemberCoordinates {
  latitude: number
  longitude: number
}

function resolveImage(image: ImageResponse | null) {
  if (!image || /^(?:blob:|data:|https?:\/\/)/i.test(image.url)) return image
  if (!/^https?:\/\//i.test(config.apiUrl)) return image
  return { ...image, url: new URL(image.url, new URL(config.apiUrl).origin).toString() }
}

function locationParams(coordinates?: MemberCoordinates, query?: string) {
  return {
    ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
    ...(query?.trim() ? { query: query.trim() } : {}),
  }
}

export const gymMembershipApi = {
  async mine() {
    const { data } = await httpClient.get<GymMembershipResponse[]>(membershipEndpoints.memberships)
    return data
  },

  async search(coordinates?: MemberCoordinates, query = '') {
    const { data } = await httpClient.get<GymDirectorySummaryResponse[]>(membershipEndpoints.directory, {
      params: locationParams(coordinates, query),
    })
    return data.map((gym) => ({ ...gym, logoImage: resolveImage(gym.logoImage) }))
  },

  async profile(gymId: number, coordinates?: MemberCoordinates) {
    const { data } = await httpClient.get<GymDirectoryProfileResponse>(
      `${membershipEndpoints.directory}/${gymId}`,
      { params: locationParams(coordinates) },
    )
    return {
      ...data,
      logoImage: resolveImage(data.logoImage),
      coverImage: resolveImage(data.coverImage),
      galleryImages: data.galleryImages.map((image) => resolveImage(image)!),
    }
  },

  async request(planId: number, payment: CardPaymentRequest) {
    const { data } = await httpClient.post<GymMembershipResponse>(membershipEndpoints.memberships, { planId, payment })
    return data
  },

  async createPass(membershipId: number, direction: 'ENTER' | 'EXIT') {
    const { data } = await httpClient.post<AccessPassResponse>(
      `${membershipEndpoints.memberships}/${membershipId}/passes`,
      { direction },
    )
    return data
  },

  async ownerPlans(facilityId: number) {
    const { data } = await httpClient.get<MembershipPlanResponse[]>(`/facilities/${facilityId}/membership-plans`)
    return data
  },

  async createPlan(facilityId: number, plan: MembershipPlanRequest) {
    const { data } = await httpClient.post<MembershipPlanResponse>(
      `/facilities/${facilityId}/membership-plans`,
      plan,
    )
    return data
  },

  async updatePlan(facilityId: number, planId: number, plan: MembershipPlanRequest) {
    const { data } = await httpClient.put<MembershipPlanResponse>(
      `/facilities/${facilityId}/membership-plans/${planId}`,
      plan,
    )
    return data
  },

  async deletePlan(facilityId: number, planId: number) {
    await httpClient.delete(`/facilities/${facilityId}/membership-plans/${planId}`)
  },

  async createPlanOffer(facilityId: number, planId: number, salePrice: number, startsAt: string, endsAt: string) {
    const { data } = await httpClient.post<PriceOfferResponse>(
      `/facilities/${facilityId}/membership-plans/${planId}/offers`,
      { salePrice, startsAt, endsAt },
    )
    return data
  },

  async updatePlanOffer(facilityId: number, planId: number, offerId: number, salePrice: number, startsAt: string, endsAt: string) {
    const { data } = await httpClient.put<PriceOfferResponse>(
      `/facilities/${facilityId}/membership-plans/${planId}/offers/${offerId}`,
      { salePrice, startsAt, endsAt },
    )
    return data
  },

  async cancelPlanOffer(facilityId: number, planId: number, offerId: number) {
    await httpClient.delete(`/facilities/${facilityId}/membership-plans/${planId}/offers/${offerId}`)
  },

  async ownerMemberships(facilityId: number) {
    const { data } = await httpClient.get<GymMembershipResponse[]>(`/facilities/${facilityId}/memberships`)
    return data
  },

  async decideMembership(facilityId: number, membershipId: number, decision: 'approve' | 'reject') {
    const { data } = await httpClient.post<GymMembershipResponse>(
      `/facilities/${facilityId}/memberships/${membershipId}/${decision}`,
    )
    return data
  },

  async redeemPass(facilityId: number, token: string, userId: number, gymId: number) {
    const { data } = await httpClient.post<AccessValidationResponse>(`/facilities/${facilityId}/access/scan`, { token, userId, gymId })
    return data
  },
}
