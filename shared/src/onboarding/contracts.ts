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

export type TrainerDocumentType = 'LICENCE' | 'LICENSE' | 'CV' | 'OTHER'

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

export const FACILITY_CATEGORIES = [
  'GYM',
  'SWIMMING',
  'BOXING',
  'MARTIAL_ARTS',
  'YOGA',
  'CROSSFIT',
] as const

export type FacilityCategory = (typeof FACILITY_CATEGORIES)[number]

export type GymType =
  | 'COMMERCIAL'
  | 'BOUTIQUE'
  | 'BODYBUILDING'
  | 'CROSSFIT'
  | 'POWERLIFTING'
  | 'FUNCTIONAL_TRAINING'
  | 'WOMEN_ONLY'
  | 'OTHER'

export interface GymInput {
  name: string
  description?: string
  publicEmail?: string
  phoneNumber?: string
  websiteUrl?: string
  addressLine: string
  city: string
  state?: string
  postalCode?: string
  country: string
  formattedAddress?: string
  latitude?: number
  longitude?: number
  type: GymType | ''
  capacity?: number
  open24Hours: boolean
}

export interface CreateFacilityRequest extends Omit<GymInput, 'type'> {
  category: FacilityCategory
  type: GymType
  logoImageId?: number
  coverImageId?: number
  galleryImageIds: number[]
}

export interface UpdateGymLocationRequest extends Pick<
  GymInput,
  'addressLine' | 'city' | 'state' | 'postalCode' | 'country'
> {
  formattedAddress: string
  latitude: number
  longitude: number
}

export interface GymResponse extends CreateFacilityRequest {
  id: number
  facilityId: number
  ownerId: number
  status: string
  logoImage: ImageResponse | null
  coverImage: ImageResponse | null
  galleryImages: ImageResponse[]
  createdAt: string
}

export interface CompleteGymOnboardingRequest {
  onboarding: OnboardingRequest
  facility: CreateFacilityRequest
}

export interface CompleteGymOnboardingResponse {
  onboarding: OnboardingResponse
  gym: GymResponse
}
