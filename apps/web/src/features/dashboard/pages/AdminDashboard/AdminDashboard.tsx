import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  FACILITY_CATEGORIES,
  type FacilityCategory,
} from '@swefton/shared/onboarding'
import {
  MACHINE_MUSCLE_GROUPS,
  type MachineImageResponse,
  type MachineInput,
  type MachineMuscleGroup,
  type MachineResponse,
} from '@swefton/shared/machine'
import {
  AlertTriangle,
  Boxes,
  Dumbbell,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { AppHeader } from '../../../../components/layout/AppHeader/AppHeader'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { machineApi } from '../../api/machineApi'
import styles from './AdminDashboard.module.css'

const MAX_MACHINE_IMAGES = 20
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024
const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

interface AdminDashboardProps {
  onSignOut: () => void
}

interface MachineFormState {
  name: string
  code: string
  description: string
  facilityCategory: FacilityCategory
  movements: MovementFormState[]
  existingImages: MachineImageResponse[]
  newImages: File[]
}

interface MovementFormState {
  id?: number
  name: string
  muscleGroup: MachineMuscleGroup
  videoId?: number
  videoOriginalName?: string
  videoFile?: File
  instructions?: string
  position: number
}

const labels = {
  facilityCategory: (value: string) => value.replaceAll('_', ' '),
  muscleGroup: (value: string) => value.replaceAll('_', ' '),
}

function enumValue<T extends string>(value: string): T {
  return value.trim().toUpperCase().replaceAll(' ', '_') as T
}

function emptyMovement(position = 0): MovementFormState {
  return {
    name: '',
    muscleGroup: 'CHEST',
    instructions: '',
    position,
  }
}

function emptyForm(): MachineFormState {
  return {
    name: '',
    code: '',
    description: '',
    facilityCategory: 'GYM',
    movements: [emptyMovement()],
    existingImages: [],
    newImages: [],
  }
}

function formFromMachine(machine: MachineResponse): MachineFormState {
  return {
    name: machine.name,
    code: machine.code,
    description: machine.description ?? '',
    facilityCategory: enumValue<FacilityCategory>(machine.facilityCategory),
    movements: machine.movements.map((movement, position) => ({
      id: movement.id,
      name: movement.name,
      muscleGroup: enumValue<MachineMuscleGroup>(movement.muscleGroup),
      videoId: movement.videoId ?? undefined,
      videoOriginalName: movement.videoOriginalName ?? undefined,
      instructions: movement.instructions ?? '',
      position,
    })),
    existingImages: machine.images,
    newImages: [],
  }
}

function MachineEditor({
  machine,
  onClose,
  onSaved,
}: {
  machine: MachineResponse | null
  onClose: () => void
  onSaved: (machine: MachineResponse, created: boolean) => void
}) {
  const [form, setForm] = useState<MachineFormState>(() =>
    machine ? formFromMachine(machine) : emptyForm(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const previews = useMemo(
    () => form.newImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [form.newImages],
  )

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const setField = <K extends keyof MachineFormState>(
    key: K,
    value: MachineFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }))

  const updateMovement = <K extends keyof MovementFormState>(
    index: number,
    key: K,
    value: MovementFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      movements: current.movements.map((movement, movementIndex) =>
        movementIndex === index ? { ...movement, [key]: value } : movement,
      ),
    }))
  }

  const removeMovement = (index: number) => {
    setForm((current) => ({
      ...current,
      movements: current.movements
        .filter((_, movementIndex) => movementIndex !== index)
        .map((movement, position) => ({ ...movement, position })),
    }))
  }

  const addImages = (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files)
    const invalid = selected.find(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    )
    if (invalid) {
      setError('Machine images must be JPG, PNG, or WebP files.')
      return
    }
    if (selected.some((file) => file.size > MAX_IMAGE_SIZE_BYTES)) {
      setError('Each machine image must be 10 MB or smaller.')
      return
    }
    if (form.existingImages.length + form.newImages.length + selected.length > MAX_MACHINE_IMAGES) {
      setError(`A machine can have up to ${MAX_MACHINE_IMAGES} images.`)
      return
    }
    setError('')
    setField('newImages', [...form.newImages, ...selected])
  }

  const addVideo = (index: number, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!VIDEO_CONTENT_TYPES.includes(file.type)) {
      setError('Movement videos must be MP4, WebM, MOV, or M4V files.')
      return
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError('Each movement video must be 200 MB or smaller.')
      return
    }
    setError('')
    updateMovement(index, 'videoFile', file)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.existingImages.length + form.newImages.length === 0) {
      setError('Add at least one machine image.')
      return
    }
    if (form.movements.length === 0) {
      setError('Add at least one movement.')
      return
    }
    setSaving(true)
    setError('')
    const uploadedIds: number[] = []
    const uploadedVideoIds: number[] = []
    try {
      for (let index = 0; index < form.newImages.length; index += 1) {
        const uploaded = await machineApi.uploadImage(
          form.newImages[index],
          form.existingImages.length + index,
        )
        uploadedIds.push(uploaded.id)
      }

      const movements: MachineInput['movements'] = []
      for (const [position, movement] of form.movements.entries()) {
        let videoId = movement.videoId
        if (movement.videoFile) {
          const uploaded = await machineApi.uploadVideo(movement.videoFile)
          videoId = uploaded.id
          uploadedVideoIds.push(uploaded.id)
        }
        movements.push({
          id: movement.id,
          name: movement.name.trim(),
          muscleGroup: movement.muscleGroup,
          ...(videoId ? { videoId } : {}),
          instructions: movement.instructions?.trim() || undefined,
          position,
        })
      }

      const payload: MachineInput = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        facilityCategory: form.facilityCategory,
        movements,
        imageIds: [...form.existingImages.map((image) => image.id), ...uploadedIds],
      }
      const saved = machine
        ? await machineApi.update(machine.id, payload)
        : await machineApi.create(payload)
      onSaved(saved, !machine)
    } catch (requestError) {
      await Promise.allSettled([
        ...uploadedIds.map((id) => machineApi.deleteImage(id)),
        ...uploadedVideoIds.map((id) => machineApi.deleteVideo(id)),
      ])
      setError(getApiErrorMessage(requestError, 'The machine could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="machine-editor-title">
        <header className={styles.editorHeader}>
          <div>
            <span className={styles.eyebrow}>{machine ? 'Update catalog item' : 'New catalog item'}</span>
            <h2 id="machine-editor-title">{machine ? `Edit ${machine.name}` : 'Add a machine'}</h2>
            <p>Describe the equipment and add at least one image and movement guide.</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} disabled={saving} aria-label="Close editor">
            <X aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)}>
          {error && <div className={styles.errorMessage} role="alert"><AlertTriangle aria-hidden="true" /> {error}</div>}

          <fieldset disabled={saving}>
            <legend>Machine details</legend>
            <div className={styles.formGrid}>
              <label><span>Name</span><input value={form.name} onChange={(event) => setField('name', event.target.value)} required maxLength={150} placeholder="Leg press" /></label>
              <label><span>Unique code</span><input value={form.code} onChange={(event) => setField('code', event.target.value)} required maxLength={100} placeholder="LEG-PRESS-01" /></label>
              <label><span>Facility category</span><select value={form.facilityCategory} onChange={(event) => setField('facilityCategory', event.target.value as FacilityCategory)}>{FACILITY_CATEGORIES.map((category) => <option key={category} value={category}>{labels.facilityCategory(category)}</option>)}</select></label>
              <label className={styles.fullWidth}><span>Description <small>Optional</small></span><textarea value={form.description} onChange={(event) => setField('description', event.target.value)} maxLength={5000} rows={3} placeholder="What this machine is designed for and how it fits into a workout." /></label>
            </div>
          </fieldset>

          <fieldset disabled={saving}>
            <div className={styles.fieldsetHeading}>
              <div><legend>Images</legend><p>JPG, PNG, or WebP. Maximum 10 MB each.</p></div>
              <label className={styles.uploadButton}><ImagePlus aria-hidden="true" /> Add images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addImages(event.target.files); event.target.value = '' }} /></label>
            </div>
            <div className={styles.imageStrip}>
              {form.existingImages.map((image) => (
                <div className={styles.imagePreview} key={image.id}>
                  <img src={image.url} alt={image.originalName} />
                  <button type="button" onClick={() => setField('existingImages', form.existingImages.filter((item) => item.id !== image.id))} aria-label={`Remove ${image.originalName}`}><X aria-hidden="true" /></button>
                </div>
              ))}
              {previews.map(({ file, url }, index) => (
                <div className={styles.imagePreview} key={`${file.name}-${file.lastModified}-${index}`}>
                  <img src={url} alt={file.name} />
                  <button type="button" onClick={() => setField('newImages', form.newImages.filter((_, imageIndex) => imageIndex !== index))} aria-label={`Remove ${file.name}`}><X aria-hidden="true" /></button>
                </div>
              ))}
              {form.existingImages.length + form.newImages.length === 0 && <div className={styles.emptyImages}><ImagePlus aria-hidden="true" /><span>No images added yet</span></div>}
            </div>
          </fieldset>

          <fieldset disabled={saving}>
            <div className={styles.fieldsetHeading}>
              <div><legend>Movement guides</legend><p>Add a video and instructions for every supported movement.</p></div>
              <button type="button" className={styles.secondaryButton} onClick={() => setField('movements', [...form.movements, emptyMovement(form.movements.length)])} disabled={form.movements.length >= MACHINE_MUSCLE_GROUPS.length}><Plus aria-hidden="true" /> Add movement</button>
            </div>
            <div className={styles.movements}>
              {form.movements.map((movement, index) => (
                <article className={styles.movementCard} key={movement.id ?? `new-${index}`}>
                  <div className={styles.movementHeading}><span>{String(index + 1).padStart(2, '0')}</span><strong>Movement {index + 1}</strong>{form.movements.length > 1 && <button type="button" onClick={() => removeMovement(index)} aria-label={`Remove movement ${index + 1}`}><Trash2 aria-hidden="true" /></button>}</div>
                  <div className={styles.formGrid}>
                    <label><span>Name</span><input value={movement.name} onChange={(event) => updateMovement(index, 'name', event.target.value)} required maxLength={150} placeholder="45-degree leg press" /></label>
                    <label><span>Muscle group</span><select value={movement.muscleGroup} onChange={(event) => updateMovement(index, 'muscleGroup', event.target.value as MachineMuscleGroup)}>{MACHINE_MUSCLE_GROUPS.map((group) => <option key={group} value={group} disabled={form.movements.some((item, itemIndex) => itemIndex !== index && item.muscleGroup === group)}>{labels.muscleGroup(group)}</option>)}</select></label>
                    <label className={styles.fullWidth}><span>Video file <small>Optional</small></span><span className={styles.videoPicker}><Video aria-hidden="true" /><strong>{movement.videoFile?.name ?? movement.videoOriginalName ?? 'Choose an optional MP4, WebM, MOV, or M4V video'}</strong><input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={(event) => { addVideo(index, event.target.files); event.target.value = '' }} /></span></label>
                    <label className={styles.fullWidth}><span>Instructions <small>Optional</small></span><textarea value={movement.instructions ?? ''} onChange={(event) => updateMovement(index, 'instructions', event.target.value)} maxLength={5000} rows={2} placeholder="Seat position, range of motion, and safety cues." /></label>
                  </div>
                </article>
              ))}
            </div>
          </fieldset>

          <footer className={styles.editorFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? <><LoaderCircle className={styles.spinner} aria-hidden="true" /> Saving machine...</> : <>{machine ? 'Save changes' : 'Add machine'} <Dumbbell aria-hidden="true" /></>}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export function AdminDashboard({ onSignOut }: AdminDashboardProps) {
  const [machines, setMachines] = useState<MachineResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [editorMachine, setEditorMachine] = useState<MachineResponse | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<MachineResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    void machineApi.list()
      .then((data) => active && setMachines(data))
      .catch((requestError) => active && setError(getApiErrorMessage(requestError, 'Machines could not be loaded.')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const visibleMachines = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return machines
    return machines.filter((machine) =>
      [machine.name, machine.code, machine.facilityCategory]
        .some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [machines, query])

  const movementCount = machines.reduce((total, machine) => total + machine.movements.length, 0)
  const facilityCategoryCount = new Set(machines.map((machine) => machine.facilityCategory)).size

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await machineApi.delete(deleteTarget.id)
      setMachines((current) => current.filter((machine) => machine.id !== deleteTarget.id))
      setNotice(`${deleteTarget.name} was deleted.`)
      setDeleteTarget(null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The machine could not be deleted.'))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.shell}>
      <AppHeader context="Admin console" currentPage="Machines" onSignOut={onSignOut} />
      <main className={styles.content}>
        <header className={styles.welcome}>
          <div><span className={styles.eyebrow}>Platform operations</span><h1>Machine catalog</h1><p>Add, update, and maintain the equipment available across Swefton.</p></div>
          <span className={styles.roleBadge}><ShieldCheck aria-hidden="true" /> Administrator</span>
        </header>

        <section className={styles.stats} aria-label="Machine catalog summary">
          <article><span><Dumbbell aria-hidden="true" /></span><div><strong>{machines.length}</strong><p>Total machines</p></div></article>
          <article><span><Boxes aria-hidden="true" /></span><div><strong>{movementCount}</strong><p>Movement guides</p></div></article>
          <article><span><ShieldCheck aria-hidden="true" /></span><div><strong>{facilityCategoryCount}</strong><p>Facility categories</p></div></article>
        </section>

        <section className={styles.catalogPanel}>
          <header className={styles.catalogHeader}>
            <div><span className={styles.eyebrow}>Equipment library</span><h2>All machines</h2><p>{machines.length === 1 ? '1 catalog item' : `${machines.length} catalog items`}</p></div>
            <button className={styles.primaryButton} type="button" onClick={() => { setNotice(''); setEditorMachine(null) }}><Plus aria-hidden="true" /> Add machine</button>
          </header>

          <div className={styles.toolbar}>
            <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, code, or facility category..." /><span>{visibleMachines.length} shown</span></label>
          </div>

          {error && <div className={styles.errorMessage} role="alert"><AlertTriangle aria-hidden="true" /> {error}</div>}
          {notice && <div className={styles.noticeMessage} role="status">{notice}</div>}

          {loading ? (
            <div className={styles.emptyState}><LoaderCircle className={styles.spinner} aria-hidden="true" /><h3>Loading machine catalog</h3></div>
          ) : visibleMachines.length === 0 ? (
            <div className={styles.emptyState}><Dumbbell aria-hidden="true" /><h3>{query ? 'No matching machines' : 'Your machine catalog is empty'}</h3><p>{query ? 'Try another name, code, or facility category.' : 'Add the first machine to make it available in the system.'}</p>{!query && <button className={styles.primaryButton} type="button" onClick={() => setEditorMachine(null)}><Plus aria-hidden="true" /> Add first machine</button>}</div>
          ) : (
            <div className={styles.machineGrid}>
              {visibleMachines.map((machine) => (
                <article className={styles.machineCard} key={machine.id}>
                  <div className={styles.machineImage}>{machine.images[0] ? <img src={machine.images[0].url} alt={machine.name} /> : <Dumbbell aria-hidden="true" />}<span>{machine.code}</span></div>
                  <div className={styles.machineBody}>
                    <div className={styles.machineTitle}><div><h3>{machine.name}</h3></div><span>{machine.facilityCategory}</span></div>
                    <p className={styles.machineDescription}>{machine.description || 'No description provided.'}</p>
                    <div className={styles.machineMeta}><span>{machine.movements.length} {machine.movements.length === 1 ? 'movement' : 'movements'}</span></div>
                    <div className={styles.cardActions}><button type="button" onClick={() => { setNotice(''); setEditorMachine(machine) }}><Pencil aria-hidden="true" /> Edit</button><button type="button" className={styles.deleteButton} onClick={() => setDeleteTarget(machine)}><Trash2 aria-hidden="true" /> Delete</button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {editorMachine !== undefined && <MachineEditor machine={editorMachine} onClose={() => setEditorMachine(undefined)} onSaved={(saved, created) => { setMachines((current) => created ? [saved, ...current] : current.map((machine) => machine.id === saved.id ? saved : machine)); setNotice(created ? `${saved.name} was added.` : `${saved.name} was updated.`); setEditorMachine(undefined) }} />}

      {deleteTarget && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-machine-title">
            <span><Trash2 aria-hidden="true" /></span><h2 id="delete-machine-title">Delete {deleteTarget.name}?</h2><p>This removes the machine and its images from the system. This action cannot be undone.</p>
            <div><button type="button" className={styles.cancelButton} onClick={() => setDeleteTarget(null)} disabled={deleting}>Keep machine</button><button type="button" className={styles.dangerButton} onClick={() => void confirmDelete()} disabled={deleting}>{deleting ? <><LoaderCircle className={styles.spinner} aria-hidden="true" /> Deleting...</> : <><Trash2 aria-hidden="true" /> Delete machine</>}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
