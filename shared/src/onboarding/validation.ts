import type {
  UserAddressInput,
  GymInput,
  UserPreferencesInput,
  UserProfileInput,
} from './contracts'

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export function validateProfile(
  profile: UserProfileInput,
): FieldErrors<UserProfileInput> {
  const errors: FieldErrors<UserProfileInput> = {}

  if (!profile.firstName.trim()) errors.firstName = 'First name is required.'
  if (!profile.lastName.trim()) errors.lastName = 'Last name is required.'
  if (profile.firstName.trim().length > 80) errors.firstName = 'Use 80 characters or fewer.'
  if (profile.lastName.trim().length > 80) errors.lastName = 'Use 80 characters or fewer.'
  if (profile.bio && profile.bio.length > 600) errors.bio = 'Use 600 characters or fewer.'
  if (profile.experience !== undefined && profile.experience < 0) {
    errors.experience = 'Experience cannot be negative.'
  }
  if (profile.price !== undefined && profile.price < 0) {
    errors.price = 'Price cannot be negative.'
  }

  return errors
}

export function validateAddress(
  address: UserAddressInput,
): FieldErrors<UserAddressInput> {
  const errors: FieldErrors<UserAddressInput> = {}

  if (!address.addressLine.trim()) errors.addressLine = 'Street address is required.'
  if (!address.city.trim()) errors.city = 'City is required.'
  if (!address.country.trim()) errors.country = 'Country is required.'

  return errors
}

export function validatePreferences(
  preferences: UserPreferencesInput,
): FieldErrors<UserPreferencesInput> {
  return preferences.timezone.trim()
    ? {}
    : { timezone: 'Timezone is required.' }
}

export function validateGym(gym: GymInput): FieldErrors<GymInput> {
  const errors: FieldErrors<GymInput> = {}

  if (!gym.name.trim()) errors.name = 'Facility name is required.'
  if (!gym.addressLine.trim()) errors.addressLine = 'Street address is required.'
  if (!gym.city.trim()) errors.city = 'City is required.'
  if (!gym.country.trim()) errors.country = 'Country is required.'
  if (!gym.type) errors.type = 'Select a gym type.'
  if (gym.capacity !== undefined && gym.capacity < 1) {
    errors.capacity = 'Capacity must be at least 1.'
  }
  if (!gym.formattedAddress?.trim() || gym.latitude === undefined || gym.longitude === undefined) {
    errors.latitude = 'Choose the exact facility location on the map.'
    errors.longitude = 'Choose the exact facility location on the map.'
  } else if (gym.latitude < -90 || gym.latitude > 90 || gym.longitude < -180 || gym.longitude > 180) {
    errors.latitude = 'Choose a valid map location.'
    errors.longitude = 'Choose a valid map location.'
  }

  return errors
}

export function hasFieldErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0
}
