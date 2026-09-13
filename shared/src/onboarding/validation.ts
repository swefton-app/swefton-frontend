import type {
  UserAddressInput,
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

export function hasFieldErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0
}
