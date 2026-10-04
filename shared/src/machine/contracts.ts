import type { FacilityCategory } from '../onboarding/contracts'

export const MACHINE_MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'ARMS',
  'ABS',
  'LEGS',
  'GLUTES',
  'CALVES',
  'CARDIO',
] as const

export type MachineMuscleGroup = (typeof MACHINE_MUSCLE_GROUPS)[number]

export interface MachineMovementInput {
  id?: number
  name: string
  muscleGroup: MachineMuscleGroup
  videoId?: number
  instructions?: string
  position: number
}

export interface MachineMovementResponse {
  id: number
  name: string
  muscleGroup: string
  videoId: number | null
  videoUrl: string | null
  videoOriginalName: string | null
  instructions: string | null
  position: number
}

export interface MachineVideoResponse {
  id: number
  originalName: string
  contentType: string
  fileSize: number
  url: string
  createdAt: string
  updatedAt: string | null
}

export interface MachineImageResponse {
  id: number
  userId: number | null
  facilityId: number | null
  machineId: number | null
  type: 'MACHINE'
  originalName: string
  contentType: string
  fileSize: number
  position: number
  url: string
  createdAt: string
  updatedAt: string | null
}

export interface MachineInput {
  name: string
  code: string
  description?: string
  facilityCategory: FacilityCategory
  movements: MachineMovementInput[]
  imageIds: number[]
}

export interface MachineResponse extends Omit<MachineInput, 'facilityCategory' | 'movements' | 'imageIds'> {
  id: number
  facilityCategory: string
  movements: MachineMovementResponse[]
  images: MachineImageResponse[]
}

export type FacilityMachineStatus =
  | 'ACTIVE'
  | 'COMING_SOON'
  | 'NEEDS_REPAIR'
  | 'UNDER_REPAIR'
  | 'OUT_OF_SERVICE'

export interface CreateFacilityMachineInput {
  machineId: number
  quantity: number
  status: FacilityMachineStatus
  notes?: string
  expectedArrivalDate?: string
}

export interface UpdateFacilityMachineInput extends Omit<CreateFacilityMachineInput, 'machineId'> {}

export interface FacilityMachineResponse {
  id: number
  facilityId: number
  machineId: number
  machineName: string
  machineCode: string
  facilityCategory: string
  movements: MachineMovementResponse[]
  quantity: number
  status: string
  notes: string | null
  expectedArrivalDate: string | null
  createdAt: string
  updatedAt: string | null
}
