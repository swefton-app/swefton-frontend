import {
  onboardingEndpoints,
  type CompleteGymOnboardingRequest,
  type CompleteGymOnboardingResponse,
  type ImageResponse,
  type ImageType,
  type OnboardingRequest,
  type OnboardingResponse,
  type TrainerDocumentResponse,
  type TrainerDocumentType,
} from '@swefton/shared/onboarding'
import { httpClient } from '../../../core/http/httpClient'

export const onboardingApi = {
  async complete(payload: OnboardingRequest) {
    const { data } = await httpClient.post<OnboardingResponse>(
      onboardingEndpoints.onboarding,
      payload,
    )
    return data
  },

  async get() {
    const { data } = await httpClient.get<OnboardingResponse>(
      onboardingEndpoints.onboarding,
    )
    return data
  },

  async uploadProfileImage(file: File) {
    return this.uploadImage(file, 'PROFILE', 0)
  },

  async uploadImage(file: File, type: ImageType, position: number) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      'image',
      new Blob([JSON.stringify({ type, position })], {
        type: 'application/json',
      }),
    )

    const { data } = await httpClient.post<ImageResponse>(
      onboardingEndpoints.images,
      formData,
    )
    return data
  },

  async uploadTrainerDocument(file: File, type: TrainerDocumentType) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await httpClient.post<TrainerDocumentResponse>(
      `${onboardingEndpoints.trainerDocuments}?type=${encodeURIComponent(type)}`,
      formData,
    )
    return data
  },

  async uploadFacilityDocument(file: File, type: TrainerDocumentType) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await httpClient.post<TrainerDocumentResponse>(
      `${onboardingEndpoints.facilityDocuments}?type=${encodeURIComponent(type)}`,
      formData,
    )
    return data
  },

  async completeGymOnboarding(payload: CompleteGymOnboardingRequest) {
    const { data } = await httpClient.post<CompleteGymOnboardingResponse>(
      onboardingEndpoints.gymOnboarding,
      payload,
    )
    return data
  },
}

export async function imageUrlToFile(url: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Your Google profile image could not be downloaded.')

  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) {
    throw new Error('Your Google profile image is not a supported image.')
  }

  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  return new File([blob], `google-profile.${extension}`, { type: blob.type })
}
