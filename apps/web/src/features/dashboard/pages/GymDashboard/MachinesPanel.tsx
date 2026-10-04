import { useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import type {
  FacilityMachineResponse,
  FacilityMachineStatus,
  MachineResponse,
} from '@swefton/shared/machine'
import {
  MACHINE_MUSCLE_GROUPS,
  type MachineMuscleGroup,
} from '@swefton/shared/machine'
import {
  AlertTriangle,
  Check,
  Dumbbell,
  Eye,
  ListChecks,
  LoaderCircle,
  Minus,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { FormField } from '../../../../components/ui/FormField'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { facilityMachineApi } from '../../api/facilityMachineApi'
import { machineApi } from '../../api/machineApi'
import styles from './MachinesPanel.module.css'

type View = 'catalog' | 'inventory'
type MuscleFilter = 'ALL' | MachineMuscleGroup

interface MachinesPanelProps {
  facilityId: number
  facilityName: string
  facilityCategory: string
}

function normalized(value: string) {
  return value.trim().toUpperCase().replaceAll(' ', '_')
}

function humanize(value: string) {
  return normalized(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

const muscleFilterOptions: readonly SelectOption[] = [
  { value: 'ALL', label: 'All muscle groups', description: 'Show every machine' },
  ...MACHINE_MUSCLE_GROUPS.map((group) => ({
    value: group,
    label: humanize(group),
  })),
]

function muscleGroups(machine: Pick<MachineResponse, 'movements'>) {
  return [...new Set(machine.movements.map((movement) => movement.muscleGroup))]
}

export function MachinesPanel({ facilityId, facilityName, facilityCategory }: MachinesPanelProps) {
  const [view, setView] = useState<View>('catalog')
  const [catalog, setCatalog] = useState<MachineResponse[]>([])
  const [inventory, setInventory] = useState<FacilityMachineResponse[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('ALL')
  const [details, setDetails] = useState<MachineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void Promise.all([
      machineApi.list(),
      facilityMachineApi.list(facilityId),
    ])
      .then(([machines, facilityMachines]) => {
        if (!active) return
        setCatalog(machines)
        setInventory(facilityMachines)
        setQuantities(Object.fromEntries(facilityMachines.map((item) => [item.id, item.quantity])))
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Machines could not be loaded.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [facilityId])

  const inventoryByMachine = useMemo(
    () => new Map(inventory.map((item) => [item.machineId, item])),
    [inventory],
  )

  const compatibleMachines = useMemo(() => {
    const search = query.trim().toLowerCase()
    return catalog.filter((machine) => {
      const compatible = normalized(machine.facilityCategory) === normalized(facilityCategory)
      if (!compatible) return false
      const matchesMuscle = muscleFilter === 'ALL'
        || machine.movements.some((movement) => normalized(movement.muscleGroup) === muscleFilter)
      if (!matchesMuscle) return false
      if (!search) return true
      return [machine.name, machine.code, ...muscleGroups(machine)]
        .some((value) => value.toLowerCase().includes(search))
    })
  }, [catalog, facilityCategory, muscleFilter, query])

  const setQuantity = (key: number, value: number) => {
    setQuantities((current) => ({ ...current, [key]: Math.min(9999, Math.max(1, Math.floor(value || 1))) }))
  }

  const addMachine = async (machine: MachineResponse) => {
    const quantity = quantities[-machine.id] ?? 1
    setSavingId(machine.id)
    setError('')
    setNotice('')
    try {
      const added = await facilityMachineApi.create(facilityId, {
        machineId: machine.id,
        quantity,
        status: 'ACTIVE',
      })
      setInventory((current) => [...current, added].sort((a, b) => a.machineName.localeCompare(b.machineName)))
      setQuantities((current) => ({ ...current, [added.id]: added.quantity }))
      setNotice(`${machine.name} was added to ${facilityName}.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'This machine could not be added.'))
    } finally {
      setSavingId(null)
    }
  }

  const updateQuantity = async (item: FacilityMachineResponse, nextQuantity?: number) => {
    const quantity = nextQuantity ?? quantities[item.id] ?? item.quantity
    setSavingId(item.machineId)
    setError('')
    setNotice('')
    try {
      const updated = await facilityMachineApi.update(facilityId, item.id, {
        quantity,
        status: normalized(item.status) as FacilityMachineStatus,
        notes: item.notes ?? undefined,
        expectedArrivalDate: item.expectedArrivalDate ?? undefined,
      })
      setInventory((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setQuantities((current) => ({ ...current, [item.id]: updated.quantity }))
      setNotice(`${item.machineName} quantity was updated.`)
    } catch (requestError) {
      setQuantities((current) => ({ ...current, [item.id]: item.quantity }))
      setError(getApiErrorMessage(requestError, 'The quantity could not be updated.'))
    } finally {
      setSavingId(null)
    }
  }

  const removeMachine = async (item: FacilityMachineResponse) => {
    if (!window.confirm(`Remove ${item.machineName} from ${facilityName}?`)) return
    setSavingId(item.machineId)
    setError('')
    setNotice('')
    try {
      await facilityMachineApi.delete(facilityId, item.id)
      setInventory((current) => current.filter((entry) => entry.id !== item.id))
      setNotice(`${item.machineName} was removed from ${facilityName}.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'The machine could not be removed.'))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <div className={styles.loading}><LoaderCircle /><strong>Loading machine catalog</strong></div>
  }

  return (
    <div className={styles.content}>
      <section className={styles.header}>
        <div><span>Equipment inventory</span><h2>{facilityName}</h2><p>Choose equipment from the Swefton catalog and record how many units are available.</p></div>
        <div className={styles.tabs}>
          <button className={view === 'catalog' ? styles.activeTab : ''} type="button" onClick={() => setView('catalog')}><PackagePlus /> Add machines</button>
          <button className={view === 'inventory' ? styles.activeTab : ''} type="button" onClick={() => setView('inventory')}><ListChecks /> My machines <b>{inventory.length}</b></button>
        </div>
      </section>

      {error && <div className={styles.error} role="alert"><AlertTriangle /> {error}</div>}
      {notice && <div className={styles.notice} role="status"><Check /> {notice}</div>}

      {view === 'catalog' ? (
        <>
          <div className={styles.filters}>
            <FormField
              className={styles.searchField}
              icon={<Search />}
              label="Search catalog"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by machine, code, or muscle group"
              trailing={<span className={styles.searchCount}>{compatibleMachines.length} available</span>}
            />
            <div className={styles.selectField}>
              <span className={styles.filterLabel}>Muscle group</span>
              <Select
                value={muscleFilter}
                options={muscleFilterOptions}
                onChange={(value) => setMuscleFilter(value as MuscleFilter)}
                ariaLabel="Filter machines by muscle group"
                icon={<SlidersHorizontal />}
              />
            </div>
            <div className={styles.categoryFilter}>
              <Dumbbell />
              <span><small>Catalog</small><strong>{humanize(facilityCategory)} machines</strong></span>
            </div>
          </div>
          {compatibleMachines.length ? (
            <div className={styles.grid}>
              {compatibleMachines.map((machine) => {
                const registered = inventoryByMachine.get(machine.id)
                const quantity = quantities[-machine.id] ?? 1
                return (
                  <article className={`${styles.card} ${registered ? styles.registered : ''}`} key={machine.id}>
                    <div className={styles.image}>
                      {machine.images[0] ? <img src={machine.images[0].url} alt={machine.name} /> : <Dumbbell />}
                      <span className={styles.codeBadge}>{machine.code}</span>
                      {registered && <span className={styles.registeredBadge}><Check /> In your gym</span>}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardHeading}>
                        <div><small>Equipment</small><h3>{machine.name}</h3></div>
                        <span>{machine.movements.length} guide{machine.movements.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className={styles.muscles}>{muscleGroups(machine).map((group) => <span key={group}>{group}</span>)}</div>
                      <div className={styles.cardActions}>
                        <button className={styles.detailsButton} type="button" onClick={() => setDetails(machine)}><Eye /> Details</button>
                        {registered ? (
                          <button className={styles.addedButton} type="button" onClick={() => setView('inventory')}><Check /> View mine</button>
                        ) : (
                          <div className={styles.addControls}>
                            <Quantity value={quantity} onChange={(value) => setQuantity(-machine.id, value)} />
                            <button className={styles.addButton} type="button" disabled={savingId === machine.id} onClick={() => void addMachine(machine)}>{savingId === machine.id ? <LoaderCircle className={styles.spin} /> : <PackagePlus />} <span>Add</span></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : <Empty title="No matching machines" copy="No catalog machines match this facility category or search." />}
        </>
      ) : inventory.length ? (
        <div className={styles.grid}>
          {inventory.map((item) => {
            const machine = catalog.find((entry) => entry.id === item.machineId)
            return (
              <article className={styles.card} key={item.id}>
                <div className={styles.image}>{machine?.images[0] ? <img src={machine.images[0].url} alt={item.machineName} /> : <Dumbbell />}<span className={styles.quantityBadge}>{item.quantity} unit{item.quantity === 1 ? '' : 's'}</span></div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <div><small>{item.machineCode} · {item.status}</small><h3>{item.machineName}</h3></div>
                    <span>{item.movements.length} guide{item.movements.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className={styles.muscles}>{muscleGroups(machine ?? { movements: item.movements }).map((group) => <span key={group}>{group}</span>)}</div>
                  <div className={styles.inventoryActions}>
                    <div className={styles.inventoryQuantity}>
                      <span>Quantity</span>
                      <Quantity
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(value) => setQuantity(item.id, value)}
                        onCommit={(value) => void updateQuantity(item, value)}
                        disabled={savingId === item.machineId}
                      />
                    </div>
                    <div className={styles.inventoryUtilities}>
                      {machine && <button type="button" onClick={() => setDetails(machine)}><Eye /> Details</button>}
                      <button className={styles.removeButton} type="button" disabled={savingId === item.machineId} onClick={() => void removeMachine(item)} aria-label={`Remove ${item.machineName}`}><Trash2 /></button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : <Empty title="No machines added yet" copy="Open Add machines, choose equipment, and enter the quantity available in your gym." action={<button type="button" onClick={() => setView('catalog')}><Plus /> Add your first machine</button>} />}

      {details && <MachineDetails machine={details} onClose={() => setDetails(null)} />}
    </div>
  )
}

function Quantity({ value, onChange, onCommit, disabled = false }: { value: number; onChange: (value: number) => void; onCommit?: (value: number) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const changeDraft = (nextValue: string) => {
    const digits = nextValue.replace(/\D/g, '').slice(0, 4)
    setDraft(digits)
    if (digits) onChange(Number(digits))
  }

  const normalizeDraft = () => {
    const quantity = Math.min(9999, Math.max(1, Number(draft) || 1))
    setDraft(String(quantity))
    onChange(quantity)
    onCommit?.(quantity)
  }

  const step = (quantity: number) => {
    onChange(quantity)
    onCommit?.(quantity)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) return
    normalizeDraft()
  }

  return (
    <div className={styles.quantity} aria-label="Machine quantity" ref={rootRef}>
      <button type="button" onClick={() => step(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity"><Minus /></button>
      <input
        aria-label="Quantity"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={draft}
        disabled={disabled}
        onChange={(event) => changeDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
      />
      <button type="button" onClick={() => step(value + 1)} disabled={disabled} aria-label="Increase quantity"><Plus /></button>
    </div>
  )
}

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className={styles.empty}><Dumbbell /><h3>{title}</h3><p>{copy}</p>{action}</div>
}

function MachineDetails({ machine, onClose }: { machine: MachineResponse; onClose: () => void }) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="machine-details-title">
        <header><div><span>{machine.code}</span><h2 id="machine-details-title">{machine.name}</h2><p>{machine.description || 'No description provided.'}</p></div><button type="button" onClick={onClose} aria-label="Close details"><X /></button></header>
        {machine.images.length > 0 && <div className={styles.detailImages}>{machine.images.map((image) => <img key={image.id} src={image.url} alt={image.originalName} />)}</div>}
        <div className={styles.movementList}>
          {machine.movements.map((movement) => (
            <article key={movement.id}>
              <div><span>{movement.muscleGroup}</span><h3>{movement.name}</h3><p>{movement.instructions || 'No additional instructions.'}</p></div>
              {movement.videoUrl && <video controls preload="metadata" src={movement.videoUrl}>Your browser does not support video playback.</video>}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
