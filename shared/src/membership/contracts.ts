import type { ImageResponse } from '../onboarding/contracts'

export interface MembershipPlanResponse {
  id: number
  name: string
  visitsPerWeek: number | null
  price: number
  effectivePrice: number
  currency: string
  durationDays: number
  durationMonths: number
  active: boolean
  offer: PriceOfferResponse | null
}

export interface MembershipPlanRequest {
  visitsPerWeek: number
  durationMonths: number
  price: number
  currency: string
  active: boolean
}

export interface PriceOfferResponse {
  id: number
  originalPrice: number
  salePrice: number
  startsAt: string
  endsAt: string
  active: boolean
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED'
}

export interface CardPaymentRequest {
  cardholderName: string
  cardNumber: string
  expiryMonth: number
  expiryYear: number
  cvc: string
}

export interface PaymentResponse {
  reference: string
  paidAmount: number
  currency: string
  status: string
  paidAt: string
}

export interface GymMembershipResponse {
  id: number
  facilityId: number
  gymId: number
  gymName: string
  memberName: string
  memberEmail: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
  plan: MembershipPlanResponse
  payment: PaymentResponse | null
  requestedAt: string
  startsOn: string | null
  endsOn: string | null
  entriesThisWeek: number
  remainingEntriesThisWeek: number | null
  checkedIn: boolean
}

export interface GymDirectorySummaryResponse {
  id: number
  facilityId: number
  name: string
  formattedAddress: string
  city: string
  country: string
  latitude: number
  longitude: number
  distanceKm: number | null
  logoImage: ImageResponse | null
  peopleInsideCount: number
  checkedInByMe: boolean
  membershipStatus: GymMembershipResponse['status'] | null
}

export interface GymMachineSummaryResponse {
  name: string
  quantity: number
  status: string
}

export interface OpeningHoursResponse {
  days: string
  opensAt: string | null
  closesAt: string | null
  open24Hours: boolean
}

export interface GymDirectoryProfileResponse extends Omit<GymDirectorySummaryResponse, 'distanceKm'> {
  distanceKm: number | null
  description: string | null
  phoneNumber: string | null
  websiteUrl: string | null
  coverImage: ImageResponse | null
  galleryImages: ImageResponse[]
  openingHours: OpeningHoursResponse[]
  machines: GymMachineSummaryResponse[]
  plans: MembershipPlanResponse[]
  membership: GymMembershipResponse | null
}

export interface AccessPassResponse {
  token: string
  qrPayload: string
  userId: number
  gymId: number
  facilityId: number
  direction: 'ENTER' | 'EXIT'
  expiresAt: string
  remainingEntriesThisWeek: number | null
}

export interface AccessValidationResponse {
  approved: boolean
  direction: 'ENTER' | 'EXIT'
  memberName: string
  gymName: string
  processedAt: string
  remainingEntriesThisWeek: number | null
}
