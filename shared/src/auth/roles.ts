import type { UserRole } from './contracts'

export interface RegistrationRole {
  value: UserRole
  label: string
  description: string
}

export const registrationRoles: readonly RegistrationRole[] = [
  { value: 'USER', label: 'Member', description: 'Train & track' },
  { value: 'TRAINER', label: 'Trainer', description: 'Coach others' },
  {
    value: 'FACILITY_OWNER',
    label: 'Business',
    description: 'Grow your business',
  },
]
