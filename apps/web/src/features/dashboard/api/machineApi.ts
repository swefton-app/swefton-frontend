import {
  machineEndpoints,
  type MachineImageResponse,
  type MachineInput,
  type MachineResponse,
  type MachineVideoResponse,
} from '@swefton/shared/machine'
import { config } from '../../../config'
import { httpClient } from '../../../core/http/httpClient'

function resolveImageUrl(url: string) {
  if (/^(?:blob:|data:|https?:\/\/)/i.test(url)) return url

  if (/^https?:\/\//i.test(config.apiUrl)) {
    return new URL(url, new URL(config.apiUrl).origin).toString()
  }

  return url
}

function normalizeMachine(machine: MachineResponse): MachineResponse {
  return {
    ...machine,
    movements: machine.movements.map((movement) => ({
      ...movement,
      videoUrl: movement.videoUrl ? resolveImageUrl(movement.videoUrl) : null,
    })),
    images: machine.images.map((image) => ({
      ...image,
      url: resolveImageUrl(image.url),
    })),
  }
}

export const machineApi = {
  async list() {
    const { data } = await httpClient.get<MachineResponse[]>(machineEndpoints.machines)
    return data.map(normalizeMachine)
  },

  async create(payload: MachineInput) {
    const { data } = await httpClient.post<MachineResponse>(machineEndpoints.machines, payload)
    return normalizeMachine(data)
  },

  async update(id: number, payload: MachineInput) {
    const { data } = await httpClient.put<MachineResponse>(
      `${machineEndpoints.machines}/${id}`,
      payload,
    )
    return normalizeMachine(data)
  },

  async delete(id: number) {
    await httpClient.delete(`${machineEndpoints.machines}/${id}`)
  },

  async uploadImage(file: File, position: number) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append(
      'image',
      new Blob([JSON.stringify({ type: 'MACHINE', position })], {
        type: 'application/json',
      }),
    )

    const { data } = await httpClient.post<MachineImageResponse>(
      machineEndpoints.images,
      formData,
    )
    return { ...data, url: resolveImageUrl(data.url) }
  },

  async deleteImage(id: number) {
    await httpClient.delete(`${machineEndpoints.images}/${id}`)
  },

  async uploadVideo(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await httpClient.post<MachineVideoResponse>(
      machineEndpoints.videos,
      formData,
      { timeout: 120_000 },
    )
    return { ...data, url: resolveImageUrl(data.url) }
  },

  async deleteVideo(id: number) {
    await httpClient.delete(`${machineEndpoints.videos}/${id}`)
  },

}
