import type {
  CreateFacilityMachineInput,
  FacilityMachineResponse,
  UpdateFacilityMachineInput,
} from '@swefton/shared/machine'
import { httpClient } from '../../../core/http/httpClient'

export const facilityMachineApi = {
  async list(facilityId: number) {
    const { data } = await httpClient.get<FacilityMachineResponse[]>(
      `/facilities/${facilityId}/machines`,
    )
    return data
  },

  async create(facilityId: number, payload: CreateFacilityMachineInput) {
    const { data } = await httpClient.post<FacilityMachineResponse>(
      `/facilities/${facilityId}/machines`,
      payload,
    )
    return data
  },

  async update(
    facilityId: number,
    facilityMachineId: number,
    payload: UpdateFacilityMachineInput,
  ) {
    const { data } = await httpClient.put<FacilityMachineResponse>(
      `/facilities/${facilityId}/machines/${facilityMachineId}`,
      payload,
    )
    return data
  },

  async delete(facilityId: number, facilityMachineId: number) {
    await httpClient.delete(`/facilities/${facilityId}/machines/${facilityMachineId}`)
  },
}
