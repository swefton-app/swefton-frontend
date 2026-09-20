import {
  staffEndpoints,
  type CompleteStaffOnboardingRequest,
  type FacilityStaffInvitation,
  type FacilityStaffResponse,
  type StaffAccountSetupResponse,
  type StaffInvitationDetails,
  type StaffOnboardingContext,
} from '@swefton/shared/staff'
import type { GenerateCvRequest, GenerateCvResponse } from '@swefton/shared/cv'
import type { TrainerDocumentResponse } from '@swefton/shared/onboarding'
import { httpClient } from '../../../core/http/httpClient'

export const staffApi = {
  async invite(facilityId: number, email: string) {
    const { data } = await httpClient.post<FacilityStaffInvitation>(
      staffEndpoints.facilityInvitations(facilityId),
      { email },
    )
    return data
  },

  async invitations(facilityId: number) {
    const { data } = await httpClient.get<FacilityStaffInvitation[]>(
      staffEndpoints.facilityInvitations(facilityId),
    )
    return data
  },

  async revoke(facilityId: number, invitationId: number) {
    await httpClient.delete(`${staffEndpoints.facilityInvitations(facilityId)}/${invitationId}`)
  },

  async invitationDetails(token: string) {
    const { data } = await httpClient.get<StaffInvitationDetails>(
      staffEndpoints.publicInvitation(token),
    )
    return data
  },

  async setPassword(token: string, password: string, confirmPassword: string) {
    const { data } = await httpClient.post<StaffAccountSetupResponse>(
      staffEndpoints.password(token),
      { password, confirmPassword },
    )
    return data
  },

  async onboardingContext() {
    const { data } = await httpClient.get<StaffOnboardingContext>(staffEndpoints.onboardingContext)
    return data
  },

  async uploadDocument(file: File, type: 'CV' | 'LICENCE') {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post<TrainerDocumentResponse>(
      `${staffEndpoints.documents}?type=${type}`,
      formData,
    )
    return data
  },

  async generateCv(request: GenerateCvRequest) {
    const { data } = await httpClient.post<GenerateCvResponse>(staffEndpoints.generateCv, request)
    return data
  },

  async completeOnboarding(request: CompleteStaffOnboardingRequest) {
    const { data } = await httpClient.post<FacilityStaffResponse>(staffEndpoints.onboarding, request)
    return data
  },
}
