import type {
  FieldErrors,
  UserAddressInput,
} from '@swefton/shared/onboarding'
import { LocateFixed, MapPin } from 'lucide-react'
import formStyles from '../OnboardingForm.module.css'
import styles from './AddressStep.module.css'

interface AddressStepProps {
  value: UserAddressInput
  errors: FieldErrors<UserAddressInput>
  onChange: (value: UserAddressInput) => void
}

export function AddressStep({ value, errors, onChange }: AddressStepProps) {
  const update = <Key extends keyof UserAddressInput>(
    key: Key,
    nextValue: UserAddressInput[Key],
  ) => onChange({ ...value, [key]: nextValue })

  return (
    <div className={formStyles.stepContent}>
      <div className={styles.locationNote}>
        <span><LocateFixed /></span>
        <div>
          <strong>Your location stays private</strong>
          <p>Only your city is shown publicly. Your full address helps us personalize nearby results.</p>
        </div>
      </div>

      <label className={formStyles.field}>
        <span>Street address <b>*</b></span>
        <div className={formStyles.iconInput}>
          <MapPin />
          <input
            autoFocus
            autoComplete="street-address"
            value={value.addressLine}
            onChange={(event) => update('addressLine', event.target.value)}
            placeholder="Street name and number"
            aria-invalid={Boolean(errors.addressLine)}
          />
        </div>
        {errors.addressLine && <small className={formStyles.error}>{errors.addressLine}</small>}
      </label>

      <div className={formStyles.twoColumns}>
        <label className={formStyles.field}>
          <span>City <b>*</b></span>
          <input
            autoComplete="address-level2"
            value={value.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder="e.g. Tirana"
            aria-invalid={Boolean(errors.city)}
          />
          {errors.city && <small className={formStyles.error}>{errors.city}</small>}
        </label>
        <label className={formStyles.field}>
          <span>State / region</span>
          <input
            autoComplete="address-level1"
            value={value.state ?? ''}
            onChange={(event) => update('state', event.target.value)}
            placeholder="e.g. Tirana"
          />
        </label>
      </div>

      <div className={formStyles.twoColumns}>
        <label className={formStyles.field}>
          <span>Postal code</span>
          <input
            autoComplete="postal-code"
            value={value.postalCode ?? ''}
            onChange={(event) => update('postalCode', event.target.value)}
            placeholder="e.g. 1001"
          />
        </label>
        <label className={formStyles.field}>
          <span>Country <b>*</b></span>
          <input
            autoComplete="country-name"
            value={value.country}
            onChange={(event) => update('country', event.target.value)}
            placeholder="e.g. Albania"
            aria-invalid={Boolean(errors.country)}
          />
          {errors.country && <small className={formStyles.error}>{errors.country}</small>}
        </label>
      </div>
    </div>
  )
}
