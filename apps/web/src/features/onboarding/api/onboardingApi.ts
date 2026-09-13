import {
  onboardingEndpoints,
  type ImageResponse,
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
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      'image',
      new Blob([JSON.stringify({ type: 'PROFILE', position: 0 })], {
        type: 'application/json',
      }),
    )

    const { data } = await httpClient.post<ImageResponse>(
      onboardingEndpoints.images,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  async uploadTrainerDocument(file: File, type: TrainerDocumentType) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const { data } = await httpClient.post<TrainerDocumentResponse>(
      onboardingEndpoints.trainerDocuments,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
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
