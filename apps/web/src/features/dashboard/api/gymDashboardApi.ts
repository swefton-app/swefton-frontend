import type {
  CreateFacilityRequest,
  GymResponse,
  ImageResponse,
  ImageType,
  TrainerDocumentResponse,
  UpdateGymLocationRequest,
} from '@swefton/shared/onboarding'
import { config } from '../../../config'
import { httpClient } from '../../../core/http/httpClient'

function resolveImage(image: ImageResponse): ImageResponse {
  if (/^(?:blob:|data:|https?:\/\/)/i.test(image.url)) return image
  if (!/^https?:\/\//i.test(config.apiUrl)) return image
  return { ...image, url: new URL(image.url, new URL(config.apiUrl).origin).toString() }
}

function resolveGymMedia(gym: GymResponse): GymResponse {
  return {
    ...gym,
    logoImage: gym.logoImage ? resolveImage(gym.logoImage) : null,
    coverImage: gym.coverImage ? resolveImage(gym.coverImage) : null,
    galleryImages: gym.galleryImages.map(resolveImage),
  }
}

export const gymDashboardApi = {
  async getGyms() {
    const { data } = await httpClient.get<GymResponse[]>('/gyms')
    return data.map(resolveGymMedia)
  },

  async createFacility(payload: CreateFacilityRequest) {
    const { data } = await httpClient.post<GymResponse>('/gyms', payload)
    return resolveGymMedia(data)
  },

  async updateLocation(gymId: number, payload: UpdateGymLocationRequest) {
    const { data } = await httpClient.patch<GymResponse>(`/gyms/${gymId}/location`, payload)
    return resolveGymMedia(data)
  },

  async uploadImage(file: File, type: ImageType, position: number) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      'image',
      new Blob([JSON.stringify({ type, position })], { type: 'application/json' }),
    )
    const { data } = await httpClient.post<ImageResponse>('/images', formData)
    return resolveImage(data)
  },

  async uploadLicence(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await httpClient.post<TrainerDocumentResponse>(
      '/facility/documents?type=LICENCE',
      formData,
    )
    return data
  },
}
