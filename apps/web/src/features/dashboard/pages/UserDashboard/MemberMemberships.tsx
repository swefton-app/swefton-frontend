import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessPassResponse, GymDirectoryProfileResponse, GymMembershipResponse } from '@swefton/shared/membership'
import { Building2, CheckCircle2, Clock3, DoorOpen, Dumbbell, LoaderCircle, MapPin, QrCode, RefreshCw, ShieldCheck, UsersRound, X } from 'lucide-react'
import QRCode from 'qrcode'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { gymMembershipApi, type MemberCoordinates } from '../../api/gymMembershipApi'
import styles from './MemberMemberships.module.css'

interface MemberMembershipsProps {
  memberName: string
  savedCoordinates?: MemberCoordinates
  onFindGyms: () => void
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : ''
}

export function MemberMemberships({ memberName, savedCoordinates, onFindGyms }: MemberMembershipsProps) {
  const [memberships, setMemberships] = useState<GymMembershipResponse[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [facility, setFacility] = useState<GymDirectoryProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [passBusy, setPassBusy] = useState(false)
  const [pass, setPass] = useState<AccessPassResponse | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')

  const selected = useMemo(
    () => memberships.find((membership) => membership.id === selectedId) ?? memberships[0] ?? null,
    [memberships, selectedId],
  )

  const loadMemberships = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await gymMembershipApi.mine()
      setMemberships(next)
      setSelectedId((current) => next.some((membership) => membership.id === current)
        ? current
        : next.find((membership) => membership.status === 'ACTIVE')?.id ?? next[0]?.id ?? null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not load your gym memberships.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadMemberships() }, [loadMemberships])

  useEffect(() => {
    if (!selected) {
      setFacility(null)
      return
    }
    let active = true
    setLoading(true)
    void gymMembershipApi.profile(selected.gymId, savedCoordinates)
      .then((profile) => { if (active) setFacility(profile) })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, 'We could not load this facility.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [savedCoordinates, selected])

  const createPass = async () => {
    if (!selected || selected.status !== 'ACTIVE') return
    setPassBusy(true)
    setError('')
    try {
      const nextPass = await gymMembershipApi.createPass(selected.id, selected.checkedIn ? 'EXIT' : 'ENTER')
      setQrDataUrl(await QRCode.toDataURL(nextPass.qrPayload, {
        width: 340,
        margin: 2,
        color: { dark: '#111815', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }))
      setPass(nextPass)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not create your gym access QR code.'))
    } finally {
      setPassBusy(false)
    }
  }

  const closePass = () => {
    setPass(null)
    setQrDataUrl('')
    void loadMemberships()
  }

  if (loading && !memberships.length) {
    return <section className={styles.state}><LoaderCircle className={styles.spin} /><h1>Loading your memberships</h1></section>
  }

  if (!memberships.length) {
    return (
      <section className={styles.state}>
        <Building2 />
        <h1>You do not have a gym membership yet.</h1>
        <p>Find a nearby gym, choose a plan, and send your request to the owner.</p>
        <button type="button" onClick={onFindGyms}>Find a gym</button>
        {error && <p className={styles.error}>{error}</p>}
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><span>Member access</span><h1>My gym memberships</h1><p>Select a membership to view its facility and generate your access code.</p></div>
        <label>Selected membership<select value={selected?.id ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))}>{memberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.gymName} · {membership.plan.name}</option>)}</select></label>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {selected && facility && (
        <>
          <article className={styles.facilityHero} style={facility.coverImage ? { backgroundImage: `linear-gradient(90deg,rgba(8,14,11,.95),rgba(8,14,11,.58)),url(${facility.coverImage.url})` } : undefined}>
            <div className={styles.identity}>
              <span className={styles.logo}>{facility.logoImage ? <img src={facility.logoImage.url} alt={`${facility.name} logo`} /> : <Dumbbell />}</span>
              <div><span className={styles.status}>{selected.status}</span><h2>{facility.name}</h2><p><MapPin /> {facility.formattedAddress}</p></div>
            </div>
            <div className={styles.activeMembers}><UsersRound /><strong>{facility.peopleInsideCount}</strong><span>people inside now</span></div>
          </article>

          <div className={styles.grid}>
            <div className={styles.detailsColumn}>
              <section className={styles.panel}>
                <header><div><span>Facility details</span><h2>Hours and equipment</h2></div><Building2 /></header>
                <div className={styles.hours}>{facility.openingHours.map((hours) => <div key={hours.days}><Clock3 /><span>{hours.days}</span><strong>{hours.open24Hours ? 'Open 24 hours' : `${formatTime(hours.opensAt)} – ${formatTime(hours.closesAt)}`}</strong></div>)}</div>
                <div className={styles.machines}>{facility.machines.map((machine) => <article key={machine.name}><Dumbbell /><div><strong>{machine.name}</strong><span>{machine.status}</span></div><b>×{machine.quantity}</b></article>)}</div>
                {!facility.machines.length && <p className={styles.emptyCopy}>The facility has not published its equipment yet.</p>}
              </section>
            </div>

            <aside className={styles.accessCard}>
              <div className={styles.planHeading}><ShieldCheck /><div><span>Your plan</span><h2>{selected.plan.name}</h2></div></div>
              <dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Weekly allowance</dt><dd>{selected.plan.visitsPerWeek ?? 7} entries</dd></div><div><dt>Used this week</dt><dd>{selected.entriesThisWeek}</dd></div><div><dt>Valid until</dt><dd>{selected.endsOn ?? 'After approval'}</dd></div></dl>
              {selected.status === 'ACTIVE' ? (
                <>
                  <div className={styles.remaining}><strong>{selected.remainingEntriesThisWeek ?? '∞'}</strong><span>entries remaining this week</span></div>
                  <button type="button" onClick={() => void createPass()} disabled={passBusy}>{passBusy ? <LoaderCircle className={styles.spin} /> : selected.checkedIn ? <DoorOpen /> : <QrCode />}{selected.checkedIn ? 'Generate exit QR' : 'Generate entry QR'}</button>
                  <small>{memberName} · Welcome to {facility.name}</small>
                </>
              ) : (
                <div className={styles.pending}><Clock3 /><strong>{selected.status === 'PENDING' ? 'Waiting for gym approval' : `Membership ${selected.status.toLowerCase()}`}</strong><button type="button" onClick={() => void loadMemberships()}><RefreshCw /> Refresh</button></div>
              )}
            </aside>
          </div>
        </>
      )}

      {pass && qrDataUrl && (
        <div className={styles.qrBackdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) closePass() }}>
          <section className={styles.qrDialog} role="dialog" aria-modal="true" aria-labelledby="membership-qr-title">
            <button className={styles.close} type="button" onClick={closePass} aria-label="Close QR code"><X /></button>
            <CheckCircle2 />
            <span>{pass.direction} PASS</span>
            <h2 id="membership-qr-title">{facility?.name}</h2>
            <img src={qrDataUrl} alt={`${pass.direction.toLowerCase()} QR code for ${facility?.name}`} />
            <div className={styles.qrIdentity}><strong>{memberName}</strong><strong>Welcome to {facility?.name}</strong></div>
            <p>The scanner verifies this single-use pass against your protected membership. Expires at {new Date(pass.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
          </section>
        </div>
      )}
    </section>
  )
}
