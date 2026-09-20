import { useEffect, useMemo, type ChangeEvent, type ReactNode } from 'react'
import type {
  FieldErrors,
  FacilityCategory,
  GymInput,
  GymType,
} from '@swefton/shared/onboarding'
import { ImagePlus, Images, X } from 'lucide-react'
import { FacilityLocationPicker } from '../../../location/components/FacilityLocationPicker/FacilityLocationPicker'
import formStyles from '../OnboardingForm.module.css'
import styles from './GymDetailsStep.module.css'

interface GymDetailsStepProps {
  category: FacilityCategory
  value: GymInput
  errors: FieldErrors<GymInput>
  logo: File | null
  cover: File | null
  gallery: File[]
  onChange: (value: GymInput) => void
  onLogoChange: (file: File | null) => void
  onCoverChange: (file: File | null) => void
  onGalleryChange: (files: File[]) => void
}

const gymTypes: readonly { value: GymType; label: string }[] = [
  { value: 'COMMERCIAL', label: 'Commercial gym' },
  { value: 'BOUTIQUE', label: 'Boutique gym' },
  { value: 'BODYBUILDING', label: 'Bodybuilding' },
  { value: 'CROSSFIT', label: 'CrossFit' },
  { value: 'POWERLIFTING', label: 'Powerlifting' },
  { value: 'FUNCTIONAL_TRAINING', label: 'Functional training' },
  { value: 'WOMEN_ONLY', label: 'Women only' },
  { value: 'OTHER', label: 'Other' },
]

export function GymDetailsStep({
  category,
  value,
  errors,
  logo,
  cover,
  gallery,
  onChange,
  onLogoChange,
  onCoverChange,
  onGalleryChange,
}: GymDetailsStepProps) {
  const update = <Key extends keyof GymInput>(key: Key, nextValue: GymInput[Key]) =>
    onChange({ ...value, [key]: nextValue })

  const selectSingle =
    (change: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      change(event.target.files?.[0] ?? null)
      event.target.value = ''
    }

  const selectGallery = (event: ChangeEvent<HTMLInputElement>) => {
    onGalleryChange(Array.from(event.target.files ?? []).slice(0, 20))
    event.target.value = ''
  }

  const facilityLabel = category === 'MARTIAL_ARTS'
    ? 'Martial arts facility'
    : category === 'CROSSFIT'
      ? 'CrossFit box'
      : `${category.charAt(0)}${category.slice(1).toLowerCase()} facility`

  return (
    <div className={formStyles.stepContent}>
      <div className={formStyles.twoColumns}>
        <Field label={`${facilityLabel} name`} required error={errors.name}>
          <input autoFocus value={value.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Power House" aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Public email">
          <input type="email" value={value.publicEmail ?? ''} onChange={(event) => update('publicEmail', event.target.value)} placeholder="hello@yourgym.com" />
        </Field>
      </div>

      <Field label="Description">
        <textarea value={value.description ?? ''} onChange={(event) => update('description', event.target.value)} placeholder="Tell members what makes your gym special." maxLength={5000} />
      </Field>

      {category === 'GYM' && (
        <Field label="Gym type" required error={errors.type}>
          <select value={value.type} onChange={(event) => update('type', event.target.value as GymType)} aria-invalid={Boolean(errors.type)}>
            <option value="">Select gym type</option>
            {gymTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </Field>
      )}

      <div className={formStyles.twoColumns}>
        <Field label="Phone number">
          <input type="tel" value={value.phoneNumber ?? ''} onChange={(event) => update('phoneNumber', event.target.value)} placeholder="+355 69 123 4567" />
        </Field>
        <Field label="Website">
          <input type="url" value={value.websiteUrl ?? ''} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="https://yourgym.com" />
        </Field>
      </div>

      <FacilityLocationPicker
        tone="dark"
        value={value}
        error={errors.latitude}
        onChange={(location) => onChange({ ...value, ...location })}
      />

      <Field label="Street address" required error={errors.addressLine}>
        <input value={value.addressLine} onChange={(event) => update('addressLine', event.target.value)} placeholder="Filled from the map; adjust if needed" aria-invalid={Boolean(errors.addressLine)} />
      </Field>
      <div className={formStyles.twoColumns}>
        <Field label="City" required error={errors.city}>
          <input value={value.city} onChange={(event) => update('city', event.target.value)} aria-invalid={Boolean(errors.city)} />
        </Field>
        <Field label="Country" required error={errors.country}>
          <input value={value.country} onChange={(event) => update('country', event.target.value)} aria-invalid={Boolean(errors.country)} />
        </Field>
      </div>
      <div className={formStyles.twoColumns}>
        <Field label="State / region">
          <input value={value.state ?? ''} onChange={(event) => update('state', event.target.value)} />
        </Field>
        <Field label="Postal code">
          <input value={value.postalCode ?? ''} onChange={(event) => update('postalCode', event.target.value)} />
        </Field>
      </div>

      <div className={formStyles.twoColumns}>
        <Field label="Capacity" error={errors.capacity}>
          <input type="number" min="1" value={value.capacity ?? ''} onChange={(event) => update('capacity', event.target.value ? Number(event.target.value) : undefined)} aria-invalid={Boolean(errors.capacity)} />
        </Field>
        <label className={styles.toggle}>
          <input type="checkbox" checked={value.open24Hours} onChange={(event) => update('open24Hours', event.target.checked)} />
          <span><strong>Open 24 hours</strong><small>Members can access the gym all day.</small></span>
        </label>
      </div>

      <section className={styles.mediaSection}>
        <header><span>Facility media</span><small>JPG, PNG or WebP · 10 MB each</small></header>
        <div className={styles.mediaGrid}>
          <ImagePicker label="Logo" file={logo} onSelect={selectSingle(onLogoChange)} onRemove={() => onLogoChange(null)} />
          <ImagePicker label="Cover" file={cover} onSelect={selectSingle(onCoverChange)} onRemove={() => onCoverChange(null)} wide />
        </div>
        <label className={styles.galleryPicker}>
          <Images />
          <span><strong>Gallery</strong><small>{gallery.length ? `${gallery.length} image${gallery.length === 1 ? '' : 's'} selected` : 'Select up to 20 images'}</small></span>
          <span className={styles.choose}>Choose images</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectGallery} />
        </label>
        {gallery.length > 0 && (
          <div className={styles.galleryList}>
            {gallery.map((file, index) => (
              <span key={`${file.name}-${file.lastModified}`}>
                {index + 1}. {file.name}
                <button type="button" onClick={() => onGalleryChange(gallery.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X /></button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <label className={formStyles.field}><span>{label} {required && <b>*</b>}</span>{children}{error && <small className={formStyles.error}>{error}</small>}</label>
}

function ImagePicker({ label, file, wide, onSelect, onRemove }: { label: string; file: File | null; wide?: boolean; onSelect: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : undefined, [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return (
    <div className={`${styles.imagePicker} ${wide ? styles.wide : ''}`}>
      {preview ? <img src={preview} alt={`${label} preview`} /> : <ImagePlus />}
      <label><span>{file ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} /></label>
      {file && <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}><X /></button>}
    </div>
  )
}
