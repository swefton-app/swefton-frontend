import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  hasFieldErrors,
  validateGym,
  type FacilityCategory,
  type FieldErrors,
  type GymInput,
  type GymResponse,
  type GymType,
} from '@swefton/shared/onboarding'
import { ArrowLeft, Building2, FileBadge2, ImagePlus, Images, LoaderCircle, Plus, X } from 'lucide-react'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { gymDashboardApi } from '../../api/gymDashboardApi'
import { FacilityLocationPicker } from '../../../location/components/FacilityLocationPicker/FacilityLocationPicker'
import { FacilityCategoryStep } from '../../../onboarding/components/FacilityCategoryStep/FacilityCategoryStep'
import styles from './CreateBusinessPanel.module.css'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

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

const initialGym: GymInput = {
  name: '',
  description: '',
  publicEmail: '',
  phoneNumber: '',
  websiteUrl: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  formattedAddress: '',
  type: '',
  open24Hours: false,
}

interface CreateBusinessPanelProps {
  onCancel: () => void
  onCreated: (gym: GymResponse) => void
}

export function CreateBusinessPanel({ onCancel, onCreated }: CreateBusinessPanelProps) {
  const [category, setCategory] = useState<FacilityCategory | ''>('')
  const [categoryConfirmed, setCategoryConfirmed] = useState(false)
  const [gym, setGym] = useState<GymInput>(initialGym)
  const [errors, setErrors] = useState<FieldErrors<GymInput>>({})
  const [licence, setLicence] = useState<File | null>(null)
  const [logo, setLogo] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [gallery, setGallery] = useState<File[]>([])
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const update = <Key extends keyof GymInput>(key: Key, value: GymInput[Key]) => {
    setGym((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const selectCategory = (nextCategory: FacilityCategory) => {
    setCategory(nextCategory)
    setGym((current) => ({
      ...current,
      type: nextCategory === 'GYM' ? (current.type === 'OTHER' ? '' : current.type) : 'OTHER',
    }))
  }

  const selectImage = (setter: (file: File | null) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null
      event.target.value = ''
      if (file && file.size > MAX_IMAGE_SIZE) {
        setError('Each image must be 10 MB or smaller.')
        return
      }
      setError('')
      setter(file)
    }

  const selectGallery = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 20) {
      setError('A gallery can contain up to 20 images.')
      return
    }
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError('Each gallery image must be 10 MB or smaller.')
      return
    }
    setError('')
    setGallery(files)
  }

  const selectLicence = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (file && file.size > MAX_DOCUMENT_SIZE) {
      setError('The business licence must be 20 MB or smaller.')
      return
    }
    setError('')
    setLicence(file)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateGym(gym)
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors) || !gym.type || !category) return

    setPending(true)
    setError('')
    try {
      if (licence) {
        setProgress('Uploading the business licence…')
        await gymDashboardApi.uploadLicence(licence)
      }

      setProgress('Uploading brand media…')
      const [logoImage, coverImage, galleryImages] = await Promise.all([
        logo ? gymDashboardApi.uploadImage(logo, 'LOGO', 0) : null,
        cover ? gymDashboardApi.uploadImage(cover, 'COVER', 0) : null,
        Promise.all(gallery.map((file, position) =>
          gymDashboardApi.uploadImage(file, 'GALLERY', position))),
      ])

      const optionalText = (value?: string) => value?.trim() || undefined
      setProgress('Creating the new business…')
      const created = await gymDashboardApi.createFacility({
        ...gym,
        category,
        name: gym.name.trim(),
        description: optionalText(gym.description),
        publicEmail: optionalText(gym.publicEmail),
        phoneNumber: optionalText(gym.phoneNumber),
        websiteUrl: optionalText(gym.websiteUrl),
        addressLine: gym.addressLine.trim(),
        city: gym.city.trim(),
        state: optionalText(gym.state),
        postalCode: optionalText(gym.postalCode),
        country: gym.country.trim(),
        formattedAddress: optionalText(gym.formattedAddress),
        type: gym.type,
        logoImageId: logoImage?.id,
        coverImageId: coverImage?.id,
        galleryImageIds: galleryImages.map((image) => image.id),
      })
      onCreated(created)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not create this business. Please try again.'))
      setProgress('')
    } finally {
      setPending(false)
    }
  }

  if (!categoryConfirmed) {
    return (
      <div className={styles.content}>
        <div className={styles.form}>
          <header className={styles.intro}>
            <button type="button" onClick={onCancel}><ArrowLeft /> Back to command center</button>
            <span className={styles.icon}><Building2 /></span>
            <div>
              <span className={styles.kicker}>Step 1 · Facility category</span>
              <h2>What are you adding?</h2>
              <p>Choose the category that best describes this business location.</p>
            </div>
          </header>
          <section className={styles.categorySection}>
            <FacilityCategoryStep value={category} onChange={selectCategory} tone="light" />
          </section>
          <footer className={styles.actions}>
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" disabled={!category} onClick={() => setCategoryConfirmed(true)}>
              Continue <ArrowLeft className={styles.continueArrow} />
            </button>
          </footer>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.content}>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <header className={styles.intro}>
          <button type="button" onClick={() => setCategoryConfirmed(false)}><ArrowLeft /> Back to category</button>
          <span className={styles.icon}><Building2 /></span>
          <div>
            <span className={styles.kicker}>Portfolio expansion</span>
            <h2>Add another business</h2>
            <p>Create a separate {category.toLowerCase().replace('_', ' ')} location and manage it from the same facility dashboard.</p>
          </div>
        </header>

        <FormSection number="02" title="Public identity" description="The information customers will see on the facility profile.">
          <div className={category === 'GYM' ? styles.twoColumns : undefined}>
            <Field label="Business name" required error={errors.name}>
              <input autoFocus value={gym.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Power House Downtown" />
            </Field>
            {category === 'GYM' && (
              <Field label="Gym type" required error={errors.type}>
                <select value={gym.type} onChange={(event) => update('type', event.target.value as GymType)}>
                  <option value="">Select gym type</option>
                  {gymTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </Field>
            )}
          </div>
          <Field label="Description">
            <textarea value={gym.description ?? ''} onChange={(event) => update('description', event.target.value)} placeholder="Describe this location, its equipment, and its atmosphere." maxLength={5000} />
          </Field>
          <div className={styles.twoColumns}>
            <Field label="Public email"><input type="email" value={gym.publicEmail ?? ''} onChange={(event) => update('publicEmail', event.target.value)} placeholder="location@yourbusiness.com" /></Field>
            <Field label="Phone number"><input type="tel" value={gym.phoneNumber ?? ''} onChange={(event) => update('phoneNumber', event.target.value)} placeholder="+355 69 123 4567" /></Field>
          </div>
          <Field label="Website"><input type="url" value={gym.websiteUrl ?? ''} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="https://yourbusiness.com" /></Field>
        </FormSection>

        <FormSection number="03" title="Location and operations" description="Give this business its own address and operating profile.">
          <FacilityLocationPicker
            value={gym}
            error={errors.latitude}
            onChange={(location) => {
              setGym((current) => ({ ...current, ...location }))
              setErrors((current) => ({
                ...current,
                addressLine: undefined,
                city: undefined,
                country: undefined,
                latitude: undefined,
                longitude: undefined,
              }))
            }}
          />
          <Field label="Street address" required error={errors.addressLine}><input value={gym.addressLine} onChange={(event) => update('addressLine', event.target.value)} placeholder="Filled from the map; adjust if needed" /></Field>
          <div className={styles.twoColumns}>
            <Field label="City" required error={errors.city}><input value={gym.city} onChange={(event) => update('city', event.target.value)} /></Field>
            <Field label="Country" required error={errors.country}><input value={gym.country} onChange={(event) => update('country', event.target.value)} /></Field>
          </div>
          <div className={styles.twoColumns}>
            <Field label="State / region"><input value={gym.state ?? ''} onChange={(event) => update('state', event.target.value)} /></Field>
            <Field label="Postal code"><input value={gym.postalCode ?? ''} onChange={(event) => update('postalCode', event.target.value)} /></Field>
          </div>
          <div className={styles.twoColumns}>
            <Field label="Capacity" error={errors.capacity}><input type="number" min="1" max="1000000" value={gym.capacity ?? ''} onChange={(event) => update('capacity', event.target.value ? Number(event.target.value) : undefined)} /></Field>
            <label className={styles.toggle}><input type="checkbox" checked={gym.open24Hours} onChange={(event) => update('open24Hours', event.target.checked)} /><span><strong>Open 24 hours</strong><small>This location operates all day.</small></span></label>
          </div>
        </FormSection>

        <FormSection number="04" title="Verification and media" description="Add an optional licence and the visual identity for this location.">
          <label className={styles.documentPicker}>
            <FileBadge2 />
            <span><strong>Business licence</strong><small>{licence?.name ?? 'Optional · PDF, JPG, PNG or WebP · max 20 MB'}</small></span>
            <b>{licence ? 'Change file' : 'Choose file'}</b>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={selectLicence} />
          </label>
          <div className={styles.mediaGrid}>
            <ImagePicker label="Logo" file={logo} onSelect={selectImage(setLogo)} onRemove={() => setLogo(null)} />
            <ImagePicker label="Cover" file={cover} onSelect={selectImage(setCover)} onRemove={() => setCover(null)} wide />
          </div>
          <label className={styles.galleryPicker}>
            <Images />
            <span><strong>Gallery images</strong><small>{gallery.length ? `${gallery.length} selected` : 'Select up to 20 images'}</small></span>
            <b>Choose images</b>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectGallery} />
          </label>
          {gallery.length > 0 && <div className={styles.fileList}>{gallery.map((file, index) => <span key={`${file.name}-${file.lastModified}`}>{file.name}<button type="button" onClick={() => setGallery((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X /></button></span>)}</div>}
        </FormSection>

        {(error || progress) && <div className={error ? styles.error : styles.progress} role={error ? 'alert' : 'status'}>{error || progress}</div>}

        <footer className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={pending}>Cancel</button>
          <button type="submit" disabled={pending}>{pending ? <LoaderCircle className={styles.spin} /> : <Plus />}{pending ? 'Creating business…' : 'Create business'}</button>
        </footer>
      </form>
    </div>
  )
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className={styles.section}><header><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></header><div className={styles.sectionBody}>{children}</div></section>
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <b> *</b>}</span>{children}{error && <small>{error}</small>}</label>
}

function ImagePicker({ label, file, wide, onSelect, onRemove }: { label: string; file: File | null; wide?: boolean; onSelect: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : undefined, [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return <div className={`${styles.imagePicker} ${wide ? styles.wide : ''}`}>{preview ? <img src={preview} alt={`${label} preview`} /> : <ImagePlus />}<label><span>{file ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} /></label>{file && <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}><X /></button>}</div>
}
