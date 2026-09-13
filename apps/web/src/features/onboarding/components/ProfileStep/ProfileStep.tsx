import { useEffect, useMemo, type ChangeEvent } from 'react'
import type { UserRole } from '@swefton/shared/auth'
import type {
  FieldErrors,
  Gender,
  UserProfileInput,
} from '@swefton/shared/onboarding'
import { Camera, ImagePlus, X } from 'lucide-react'
import { DatePicker } from '../../../../components/ui/DatePicker'
import formStyles from '../OnboardingForm.module.css'
import styles from './ProfileStep.module.css'

interface ProfileStepProps {
  role: UserRole
  value: UserProfileInput
  errors: FieldErrors<UserProfileInput>
  image: File | null
  googlePictureUrl?: string
  onChange: (value: UserProfileInput) => void
  onImageChange: (file: File | null) => void
  onGooglePictureRemove: () => void
}

const genders: readonly { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

export function ProfileStep({
  role,
  value,
  errors,
  image,
  googlePictureUrl,
  onChange,
  onImageChange,
  onGooglePictureRemove,
}: ProfileStepProps) {
  const localPreviewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : undefined),
    [image],
  )
  const previewUrl = localPreviewUrl ?? googlePictureUrl

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const update = <Key extends keyof UserProfileInput>(
    key: Key,
    nextValue: UserProfileInput[Key],
  ) => onChange({ ...value, [key]: nextValue })

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    onImageChange(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  const removeImage = () => {
    onImageChange(null)
    onGooglePictureRemove()
  }

  return (
    <div className={formStyles.stepContent}>
      <div className={styles.photoRow}>
        <div className={styles.avatar}>
          {previewUrl ? (
            <img src={previewUrl} alt="Profile preview" referrerPolicy="no-referrer" />
          ) : (
            <Camera aria-hidden="true" />
          )}
          {previewUrl && (
            <button type="button" onClick={removeImage} aria-label="Remove profile photo">
              <X />
            </button>
          )}
        </div>
        <div className={styles.photoCopy}>
          <strong>Your profile photo</strong>
          <span>JPG, PNG or WebP. Maximum size 10 MB.</span>
          <label className={styles.uploadButton}>
            <ImagePlus aria-hidden="true" />
            <span>{previewUrl ? 'Change photo' : 'Choose a photo'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
          </label>
          {googlePictureUrl && !image && (
            <small>Imported from your Google account</small>
          )}
        </div>
      </div>

      <div className={formStyles.twoColumns}>
        <label className={formStyles.field}>
          <span>First name <b>*</b></span>
          <input
            autoFocus
            autoComplete="given-name"
            value={value.firstName}
            onChange={(event) => update('firstName', event.target.value)}
            placeholder="e.g. Alex"
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName && <small className={formStyles.error}>{errors.firstName}</small>}
        </label>
        <label className={formStyles.field}>
          <span>Last name <b>*</b></span>
          <input
            autoComplete="family-name"
            value={value.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            placeholder="e.g. Morgan"
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName && <small className={formStyles.error}>{errors.lastName}</small>}
        </label>
      </div>

      <div className={formStyles.twoColumns}>
        <label className={formStyles.field}>
          <span>Display name</span>
          <input
            value={value.displayName ?? ''}
            onChange={(event) => update('displayName', event.target.value)}
            placeholder="How others will see you"
          />
        </label>
        <label className={formStyles.field}>
          <span>Date of birth</span>
          <DatePicker
            value={value.dateOfBirth ?? ''}
            onChange={(date) => update('dateOfBirth', date)}
            label="Date of birth"
          />
        </label>
      </div>

      <label className={formStyles.field}>
        <span>Gender</span>
        <select
          value={value.gender ?? ''}
          onChange={(event) =>
            update('gender', (event.target.value || undefined) as Gender | undefined)
          }
        >
          <option value="">Select an option</option>
          {genders.map((gender) => (
            <option key={gender.value} value={gender.value}>{gender.label}</option>
          ))}
        </select>
      </label>

      <label className={formStyles.field}>
        <span>Short bio</span>
        <textarea
          value={value.bio ?? ''}
          onChange={(event) => update('bio', event.target.value)}
          placeholder="Tell the community a little about yourself and your goals."
          maxLength={500}
        />
        <small className={formStyles.hint}>{value.bio?.length ?? 0}/500</small>
      </label>

      {role === 'TRAINER' && (
        <div className={formStyles.twoColumns}>
          <label className={formStyles.field}>
            <span>Years of experience</span>
            <input
              type="number"
              min="0"
              max="80"
              value={value.experience ?? ''}
              onChange={(event) =>
                update('experience', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="e.g. 5"
            />
          </label>
          <label className={formStyles.field}>
            <span>Hourly price</span>
            <div className={formStyles.prefixedInput}>
              <span>€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.price ?? ''}
                onChange={(event) =>
                  update('price', event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="35.00"
              />
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
