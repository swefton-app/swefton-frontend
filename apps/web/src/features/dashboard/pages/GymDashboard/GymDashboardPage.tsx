import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GymResponse, OnboardingResponse } from '@swefton/shared/onboarding'
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  Dumbbell,
  Image,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MapPin,
  PanelTop,
  Plus,
  RefreshCw,
  Settings2,
  UsersRound,
} from 'lucide-react'
import sweftonMark from '../../../../assets/swefton-mark.png'
import { tokenStorage } from '../../../../core/storage/tokenStorage'
import { activeBusinessStorage } from '../../../../core/storage/activeBusinessStorage'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { authApi } from '../../../auth/api/authApi'
import { dashboardApi } from '../../api/dashboardApi'
import { gymDashboardApi } from '../../api/gymDashboardApi'
import { FacilityLocationPicker } from '../../../location/components/FacilityLocationPicker/FacilityLocationPicker'
import { CreateBusinessPanel } from './CreateBusinessPanel'
import styles from './GymDashboardPage.module.css'

import { StaffPanel } from './StaffPanel'

type Section = 'overview' | 'facilities' | 'staff' | 'media' | 'operations' | 'create'

const navigation: readonly { id: Section; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Command center', icon: LayoutGrid },
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'staff', label: 'Staff', icon: UsersRound },
  { id: 'media', label: 'Media library', icon: Image },
  { id: 'operations', label: 'Readiness', icon: Activity },
]

const sectionTitles: Record<Section, string> = {
  overview: 'Command center',
  facilities: 'Facilities',
  staff: 'Staff',
  media: 'Media library',
  operations: 'Readiness',
  create: 'Add business',
}

function readable(value: string) {
  return value.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function ownerName(profile: OnboardingResponse['profile'] | null) {
  if (!profile) return 'Business owner'
  return profile.displayName?.trim() || `${profile.firstName} ${profile.lastName}`.trim()
}

function readinessItems(gym: GymResponse) {
  return [
    { label: 'Business description', ready: Boolean(gym.description?.trim()) },
    { label: 'Public contact details', ready: Boolean(gym.publicEmail || gym.phoneNumber) },
    { label: 'Complete facility address', ready: Boolean(gym.addressLine && gym.city && gym.country && gym.formattedAddress && gym.latitude !== undefined && gym.longitude !== undefined) },
    { label: 'Facility logo', ready: Boolean(gym.logoImage) },
    { label: 'Cover image', ready: Boolean(gym.coverImage) },
    { label: 'Gallery content', ready: gym.galleryImages.length > 0 },
    {
      label: 'Register staff members',
      ready: false,
      pendingCopy: 'Add the staff members who work at this facility.',
    },
    {
      label: 'Add machines and equipment',
      ready: false,
      pendingCopy: 'Enter the machines and equipment available at this gym.',
    },
    {
      label: 'Set daily opening hours',
      ready: gym.open24Hours,
      readyCopy: 'No daily schedule is required because this gym is open 24 hours.',
      pendingCopy: 'Add opening and closing times for every day of the week.',
    },
  ]
}

function statusTone(status: string) {
  return status === 'ACTIVE' ? styles.live : status === 'PENDING_APPROVAL' ? styles.pending : styles.draft
}

export function GymDashboardPage() {
  const role = useMemo(() => tokenStorage.getRole(), [])
  const [gyms, setGyms] = useState<GymResponse[]>([])
  const [profile, setProfile] = useState<OnboardingResponse['profile'] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [section, setSection] = useState<Section>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [ownedGyms, ownerProfile] = await Promise.all([
        gymDashboardApi.getGyms(),
        dashboardApi.get(),
      ])
      setGyms(ownedGyms)
      setProfile(ownerProfile.profile)
      setSelectedId((current) => {
        const storedId = activeBusinessStorage.get()?.id
        const nextId = current && ownedGyms.some((gym) => gym.id === current)
          ? current
          : ownedGyms.some((gym) => gym.id === storedId)
            ? storedId ?? null
            : ownedGyms[0]?.id ?? null
        const nextGym = ownedGyms.find((gym) => gym.id === nextId)
        if (nextGym) {
          activeBusinessStorage.save(
            { id: nextGym.id, category: nextGym.category },
            tokenStorage.isPersistent(),
          )
        }
        return nextId
      })
    } catch {
      setError('We could not load your facility workspace. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) {
      window.location.replace('/')
      return
    }
    if (role !== 'FACILITY_OWNER') {
      window.location.replace('/userDashboard')
      return
    }
    let active = true
    void Promise.all([gymDashboardApi.getGyms(), dashboardApi.get()])
      .then(([ownedGyms, ownerProfile]) => {
        if (!active) return
        setGyms(ownedGyms)
        setProfile(ownerProfile.profile)
        const storedId = activeBusinessStorage.get()?.id
        const initialGym = ownedGyms.find((gym) => gym.id === storedId) ?? ownedGyms[0]
        setSelectedId(initialGym?.id ?? null)
        if (initialGym) {
          activeBusinessStorage.save(
            { id: initialGym.id, category: initialGym.category },
            tokenStorage.isPersistent(),
          )
        }
      })
      .catch(() => {
        if (active) setError('We could not load your facility workspace. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [role])

  const selected = gyms.find((gym) => gym.id === selectedId) ?? gyms[0]
  const allMedia = gyms.flatMap((gym) => [
    ...(gym.logoImage ? [{ image: gym.logoImage, gym, label: 'Logo' }] : []),
    ...(gym.coverImage ? [{ image: gym.coverImage, gym, label: 'Cover' }] : []),
    ...gym.galleryImages.map((image, index) => ({ image, gym, label: `Gallery ${index + 1}` })),
  ])
  const totalCapacity = gyms.reduce((total, gym) => total + (gym.capacity ?? 0), 0)
  const activeLocations = gyms.filter((gym) => gym.status === 'ACTIVE').length

  const signOut = async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStorage.clear()
      activeBusinessStorage.clear()
      window.location.assign('/')
    }
  }

  const businessCreated = (gym: GymResponse) => {
    setGyms((current) => [gym, ...current.filter((item) => item.id !== gym.id)])
    setSelectedId(gym.id)
    activeBusinessStorage.save(
      { id: gym.id, category: gym.category },
      tokenStorage.isPersistent(),
    )
    setSection('overview')
  }

  const businessUpdated = (gym: GymResponse) => {
    setGyms((current) => current.map((item) => item.id === gym.id ? gym : item))
  }

  const selectBusiness = (businessId: number) => {
    const gym = gyms.find((item) => item.id === businessId)
    if (!gym) return
    setSelectedId(gym.id)
    activeBusinessStorage.save(
      { id: gym.id, category: gym.category },
      tokenStorage.isPersistent(),
    )
    setSection('overview')
  }

  if (role !== 'FACILITY_OWNER') return null

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <a className={styles.brand} href="/gymDashboard" aria-label="Swefton facility dashboard">
          <span><img src={sweftonMark} alt="" /></span><strong>Swefton</strong><small>Facility OS</small>
        </a>
        <nav className={styles.nav} aria-label="Facility workspace">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? styles.activeNav : ''} type="button" onClick={() => setSection(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.railFooter}>
          <div className={styles.ownerAvatar}><img src={sweftonMark} alt="" /></div>
          <div><strong>{ownerName(profile)}</strong><span>Facility owner</span></div>
          <button type="button" onClick={() => void signOut()} aria-label="Sign out"><LogOut /></button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.kicker}>Business operations</span>
            <h1>{sectionTitles[section]}</h1>
          </div>
          <div className={styles.topActions}>
            <button className={styles.addBusiness} type="button" onClick={() => setSection('create')}>
              <Plus /> Add another business
            </button>
            {gyms.length > 1 && (
              <label className={styles.locationSelect}>
                <Building2 />
                <select
                  aria-label="Switch business"
                  value={selectedId ?? ''}
                  onChange={(event) => selectBusiness(Number(event.target.value))}
                >
                  {gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
                </select>
                <ChevronDown />
              </label>
            )}
            <button className={styles.refresh} type="button" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? styles.spin : ''} /> Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <State icon={<LoaderCircle className={styles.spin} />} title="Opening your facility workspace" copy="Loading locations, media and operational details." />
        ) : error ? (
          <State icon={<CircleAlert />} title="Workspace unavailable" copy={error} action={<button type="button" onClick={() => void load()}>Try again</button>} />
        ) : section === 'create' ? (
          <CreateBusinessPanel onCancel={() => setSection('overview')} onCreated={businessCreated} />
        ) : !selected ? (
          <State icon={<Dumbbell />} title="No facility registered" copy="Create a facility to begin managing your business." action={<button type="button" onClick={() => setSection('create')}>Register a facility <ArrowRight /></button>} />
        ) : (
          <>
            {section === 'overview' && (
              <Overview key={selected.id} gym={selected} locationCount={gyms.length} activeLocations={activeLocations} totalCapacity={totalCapacity} mediaCount={allMedia.length} onOpen={(next) => setSection(next)} onUpdated={businessUpdated} />
            )}
            {section === 'facilities' && (
              <Facilities gyms={gyms} selectedId={selected.id} onSelect={selectBusiness} />
            )}
            {section === 'staff' && (
              <StaffPanel key={selected.facilityId} facilityId={selected.facilityId} facilityName={selected.name} />
            )}
            {section === 'media' && <MediaLibrary media={allMedia} />}
            {section === 'operations' && <Operations gym={selected} />}
          </>
        )}
      </main>
    </div>
  )
}

function Overview({ gym, locationCount, activeLocations, totalCapacity, mediaCount, onOpen, onUpdated }: { gym: GymResponse; locationCount: number; activeLocations: number; totalCapacity: number; mediaCount: number; onOpen: (section: Section) => void; onUpdated: (gym: GymResponse) => void }) {
  const items = readinessItems(gym)
  const completed = items.filter((item) => item.ready).length
  const progress = Math.round((completed / items.length) * 100)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [locationError, setLocationError] = useState('')

  const updateLocation = async (location: Pick<GymResponse, 'addressLine' | 'city' | 'state' | 'postalCode' | 'country' | 'formattedAddress' | 'latitude' | 'longitude'>) => {
    if (!location.formattedAddress || location.latitude === undefined || location.longitude === undefined) return
    setSavingLocation(true)
    setLocationMessage('')
    setLocationError('')
    try {
      const updated = await gymDashboardApi.updateLocation(gym.id, {
        addressLine: location.addressLine,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
      })
      onUpdated(updated)
      setLocationMessage('Facility location updated successfully.')
    } catch (requestError) {
      setLocationError(getApiErrorMessage(requestError, 'We could not update this location. Please try again.'))
    } finally {
      setSavingLocation(false)
    }
  }

  return (
    <div className={styles.content}>
      <section className={styles.facilityHero} style={gym.coverImage ? { backgroundImage: `linear-gradient(90deg, rgba(14,18,17,.96), rgba(14,18,17,.7)), url(${gym.coverImage.url})` } : undefined}>
        <div className={styles.heroIdentity}>
          <div className={styles.gymLogo}>{gym.logoImage ? <img src={gym.logoImage.url} alt="" /> : <Dumbbell />}</div>
          <div><span className={`${styles.status} ${statusTone(gym.status)}`}>{readable(gym.status)}</span><h2>{gym.name}</h2><p><MapPin /> {[gym.city, gym.country].filter(Boolean).join(', ')}</p></div>
        </div>
        <button type="button" onClick={() => onOpen('operations')}>Review readiness <ArrowRight /></button>
      </section>

      <section className={styles.metrics}>
        <Metric label="Locations" value={locationCount} note="Owned facilities" icon={<Building2 />} />
        <Metric label="Active" value={activeLocations} note="Published locations" icon={<PanelTop />} />
        <Metric label="Capacity" value={totalCapacity || '—'} note="Across all gyms" icon={<UsersRound />} />
        <Metric label="Media" value={mediaCount} note="Linked assets" icon={<Image />} />
      </section>

      <div className={styles.overviewGrid}>
        <section className={styles.panel}>
          <header><div><span className={styles.kicker}>Launch quality</span><h3>Profile readiness</h3></div><strong className={styles.progressValue}>{progress}%</strong></header>
          <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
          <div className={styles.checklist}>
            {items.map((item) => <div key={item.label} className={item.ready ? styles.ready : ''}><span>{item.ready ? <Check /> : <CircleAlert />}</span><p>{item.label}</p><small>{item.ready ? 'Ready' : 'Missing'}</small></div>)}
          </div>
        </section>
        <section className={styles.panel}>
          <header><div><span className={styles.kicker}>Facility record</span><h3>Operational snapshot</h3></div><Settings2 /></header>
          <dl className={styles.details}>
            <div><dt>Facility category</dt><dd>{readable(gym.category)}</dd></div>
            {gym.category === 'GYM' && <div><dt>Gym type</dt><dd>{readable(gym.type)}</dd></div>}
            <div><dt>Capacity</dt><dd>{gym.capacity ?? 'Not set'}</dd></div>
            <div><dt>Hours</dt><dd>{gym.open24Hours ? 'Open 24 hours' : 'Scheduled hours'}</dd></div>
            <div><dt>Contact</dt><dd>{gym.publicEmail || gym.phoneNumber || 'Not set'}</dd></div>
          </dl>
        </section>
      </div>
      <section className={`${styles.panel} ${styles.locationPanel}`}>
        <header>
          <div><span className={styles.kicker}>Facility address</span><h3>Map location</h3></div>
          <MapPin />
        </header>
        <div className={styles.locationEditor}>
          <div>
            <strong>{gym.formattedAddress || [gym.addressLine, gym.city, gym.country].filter(Boolean).join(', ')}</strong>
            <small>{gym.latitude !== undefined && gym.longitude !== undefined ? `${gym.latitude.toFixed(7)}, ${gym.longitude.toFixed(7)}` : 'No map coordinates saved'}</small>
          </div>
          <FacilityLocationPicker value={gym} onChange={(location) => void updateLocation(location)} disabled={savingLocation} />
        </div>
        {(locationError || locationMessage || savingLocation) && (
          <div className={locationError ? styles.locationError : styles.locationSuccess} role={locationError ? 'alert' : 'status'}>
            {savingLocation && <LoaderCircle className={styles.spin} />}
            {locationError || (savingLocation ? 'Saving the new location…' : locationMessage)}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, note, icon }: { label: string; value: string | number; note: string; icon: ReactNode }) {
  return <article className={styles.metric}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>
}

function Facilities({ gyms, selectedId, onSelect }: { gyms: GymResponse[]; selectedId: number; onSelect: (id: number) => void }) {
  return <div className={styles.content}><section className={styles.listPanel}><header><div><span className={styles.kicker}>Portfolio</span><h2>Your facilities</h2></div><span>{gyms.length} location{gyms.length === 1 ? '' : 's'}</span></header><div className={styles.facilityList}>{gyms.map((gym) => <button key={gym.id} className={gym.id === selectedId ? styles.selectedFacility : ''} type="button" onClick={() => onSelect(gym.id)}><span className={styles.listLogo}>{gym.logoImage ? <img src={gym.logoImage.url} alt="" /> : <Dumbbell />}</span><span><strong>{gym.name}</strong><small><MapPin /> {gym.city}, {gym.country}</small></span><span>{readable(gym.category)}</span><span className={`${styles.status} ${statusTone(gym.status)}`}>{readable(gym.status)}</span><ArrowRight /></button>)}</div></section></div>
}

function MediaLibrary({ media }: { media: Array<{ image: NonNullable<GymResponse['logoImage']>; gym: GymResponse; label: string }> }) {
  return <div className={styles.content}><section className={styles.listPanel}><header><div><span className={styles.kicker}>Brand assets</span><h2>Facility media</h2></div><span>{media.length} file{media.length === 1 ? '' : 's'}</span></header>{media.length ? <div className={styles.mediaGallery}>{media.map(({ image, gym, label }) => <figure key={`${gym.id}-${image.id}`}><img src={image.url} alt={`${gym.name} ${label}`} /><figcaption><strong>{label}</strong><span>{gym.name}</span></figcaption></figure>)}</div> : <div className={styles.emptyInline}><Image /><strong>No facility media yet</strong><span>Add a logo, cover, or gallery during facility setup.</span></div>}</section></div>
}

function Operations({ gym }: { gym: GymResponse }) {
  const items = readinessItems(gym)
  return <div className={styles.content}><section className={styles.listPanel}><header><div><span className={styles.kicker}>Operational readiness</span><h2>{gym.name}</h2></div><span>{items.filter((item) => item.ready).length}/{items.length} complete</span></header><div className={styles.operationList}>{items.map((item) => <article key={item.label} className={item.ready ? styles.operationReady : ''}><span>{item.ready ? <Check /> : <CircleAlert />}</span><div><strong>{item.label}</strong><small>{item.ready ? item.readyCopy ?? 'This information is complete.' : item.pendingCopy ?? 'Complete this item before publishing your facility profile.'}</small></div><b>{item.ready ? 'Ready' : 'Action needed'}</b></article>)}</div></section></div>
}

function State({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) {
  return <section className={styles.state}>{icon}<h2>{title}</h2><p>{copy}</p>{action}</section>
}
