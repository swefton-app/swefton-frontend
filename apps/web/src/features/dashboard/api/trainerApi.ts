import {
  trainerEndpoints,
  type TrainerCheckoutRequest,
  type TrainerPackageRequest,
  type TrainerPackageResponse,
  type TrainerProfileResponse,
  type TrainerSubscriptionResponse,
} from '@swefton/shared/trainer'
import type { PriceOfferResponse } from '@swefton/shared/membership'
import { config } from '../../../config'
import { httpClient } from '../../../core/http/httpClient'

function resolveProfile(profile: TrainerProfileResponse): TrainerProfileResponse {
  if (!profile.avatar || /^(?:blob:|data:|https?:\/\/)/i.test(profile.avatar.url) || !/^https?:\/\//i.test(config.apiUrl)) return profile
  return { ...profile, avatar: { ...profile.avatar, url: new URL(profile.avatar.url, new URL(config.apiUrl).origin).toString() } }
}

export const trainerApi = {
  async list(query = '') {
    const { data } = await httpClient.get<TrainerProfileResponse[]>(trainerEndpoints.public, {
      params: query.trim() ? { query: query.trim() } : {},
    })
    return data.map(resolveProfile)
  },

  async profile(trainerId: number) {
    const { data } = await httpClient.get<TrainerProfileResponse>(`${trainerEndpoints.public}/${trainerId}`)
    return resolveProfile(data)
  },

  async checkout(request: TrainerCheckoutRequest) {
    const { data } = await httpClient.post<TrainerSubscriptionResponse>(trainerEndpoints.subscriptions, request)
    return data
  },

  async mine() {
    const { data } = await httpClient.get<TrainerSubscriptionResponse[]>(trainerEndpoints.subscriptions)
    return data
  },

  async packages() {
    const { data } = await httpClient.get<TrainerPackageResponse[]>(trainerEndpoints.packages)
    return data
  },

  async createPackage(request: TrainerPackageRequest) {
    const { data } = await httpClient.post<TrainerPackageResponse>(trainerEndpoints.packages, request)
    return data
  },

  async updatePackage(packageId: number, request: TrainerPackageRequest) {
    const { data } = await httpClient.put<TrainerPackageResponse>(`${trainerEndpoints.packages}/${packageId}`, request)
    return data
  },

  async createOffer(packageId: number, salePrice: number, startsAt: string, endsAt: string) {
    const { data } = await httpClient.post<PriceOfferResponse>(`${trainerEndpoints.packages}/${packageId}/offers`, {
      salePrice, startsAt, endsAt,
    })
    return data
  },

  async cancelOffer(packageId: number, offerId: number) {
    await httpClient.delete(`${trainerEndpoints.packages}/${packageId}/offers/${offerId}`)
  },

  async incoming() {
    const { data } = await httpClient.get<TrainerSubscriptionResponse[]>(`${trainerEndpoints.subscriptions}/incoming`)
    return data
  },

  async decide(subscriptionId: number, decision: 'approve' | 'reject') {
    const { data } = await httpClient.post<TrainerSubscriptionResponse>(`${trainerEndpoints.subscriptions}/${subscriptionId}/${decision}`)
    return data
  },
}
