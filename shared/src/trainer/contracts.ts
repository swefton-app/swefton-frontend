import type { CardPaymentRequest, PaymentResponse, PriceOfferResponse } from '../membership/contracts'
import type { ImageResponse } from '../onboarding/contracts'

export interface TrainerPackageResponse {
  id: number
  name: string
  description: string | null
  sessionsPerWeek: number
  durationDays: number
  price: number
  effectivePrice: number
  currency: string
  active: boolean
  offer: PriceOfferResponse | null
}

export interface TrainerProfileResponse {
  id: number
  displayName: string
  bio: string | null
  experience: number | null
  city: string | null
  country: string | null
  avatar: ImageResponse | null
  packages: TrainerPackageResponse[]
}

export interface TrainerPackageRequest {
  name: string
  description: string
  sessionsPerWeek: number
  durationDays: number
  price: number
  active: boolean
}

export interface TrainerSubscriptionResponse {
  id: number
  trainerId: number
  trainerName: string
  clientName: string
  clientEmail: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED'
  trainerPackage: TrainerPackageResponse
  payment: PaymentResponse
  requestedAt: string
  startsOn: string | null
  endsOn: string | null
}

export interface TrainerCheckoutRequest {
  packageId: number
  payment: CardPaymentRequest
}
