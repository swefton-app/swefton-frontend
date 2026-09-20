import type { AuthResponse } from '../auth/contracts'
import type { OnboardingRequest } from '../onboarding/contracts'

export type FacilityStaffRole =
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'TRAINER'
  | 'INSTRUCTOR'
  | 'ADMINISTRATIVE_STAFF'
  | 'GENERAL_STAFF'

export interface FacilityStaffRoleOption {
  code: FacilityStaffRole
  label: string
}

export interface FacilityStaffInvitation {
  id: number
  facilityId: number
  email: string
  status: 'PENDING' | 'ACCOUNT_CREATED' | 'COMPLETED' | 'REVOKED'
  expiresAt: string
  createdAt: string
}

export interface StaffInvitationDetails {
  email: string
  facilityId: number
  facilityName: string
  expiresAt: string
}

export interface StaffAccountSetupResponse {
  authentication: AuthResponse
  facilityId: number
  facilityName: string
}

export interface StaffOnboardingContext {
  facilityId: number
  facilityName: string
  facilityCategory: string
  email: string
  roles: FacilityStaffRoleOption[]
}

export interface CompleteStaffOnboardingRequest {
  role: FacilityStaffRole
  onboarding: OnboardingRequest
}

export interface FacilityStaffResponse {
  id: number
  facilityId: number
  userId: number
  email: string
  role: FacilityStaffRole
  active: boolean
  createdAt: string
}
