import type { UserRole } from '../auth/contracts'

export type Gender = 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY'

export interface UserProfileInput {
  firstName: string
  lastName: string
  displayName?: string
  dateOfBirth?: string
  gender?: Gender
  bio?: string
  experience?: number
  price?: number
}

export interface UserAddressInput {
  addressLine: string
  city: string
  state?: string
  postalCode?: string
  country: string
  latitude?: number
  longitude?: number
}

export interface UserPreferencesInput {
  timezone: string
  pushNotifications: boolean
  emailNotifications: boolean
  marketingNotifications: boolean
}

export interface OnboardingRequest {
  profile: UserProfileInput
  address: UserAddressInput
  preferences: UserPreferencesInput
}

export interface OnboardingResponse extends OnboardingRequest {
  onboardingCompleted: boolean
}

export type ImageType = 'PROFILE' | 'COVER' | 'LOGO' | 'GALLERY'

export interface ImageResponse {
  id: number
  userId: number
  type: ImageType
  originalName: string
  contentType: string
  fileSize: number
  position: number
  url: string
  createdAt: string
  updatedAt: string | null
}

export type TrainerDocumentType = 'LICENCE' | 'CV' | 'OTHER'

export interface TrainerDocumentResponse {
  id: number
  fileName: string
  contentType: string
  type: TrainerDocumentType
  size: number
  uploadedAt: string
}

export interface OnboardingPrefill {
  firstName?: string
  lastName?: string
  pictureUrl?: string
}

export interface OnboardingContext {
  role: UserRole
  prefill?: OnboardingPrefill
}
