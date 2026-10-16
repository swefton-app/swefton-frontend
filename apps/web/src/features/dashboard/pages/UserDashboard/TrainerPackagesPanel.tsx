import { useCallback, useEffect, useState } from 'react'
import type { TrainerPackageRequest, TrainerPackageResponse, TrainerSubscriptionResponse } from '@swefton/shared/trainer'
import { Check, CircleAlert, Clock3, LoaderCircle, PackagePlus, Save, Tag, Trash2, UserRound, X } from 'lucide-react'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { trainerApi } from '../../api/trainerApi'
import styles from './TrainerPackagesPanel.module.css'

function localDateTime(days: number) {
  const date = new Date(Date.now() + days * 86_400_000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const blank: TrainerPackageRequest = { name: '', description: '', sessionsPerWeek: 3, durationDays: 30, price: 50, active: true }

export function TrainerPackagesPanel() {
  const [packages, setPackages] = useState<TrainerPackageResponse[]>([])
  const [requests, setRequests] = useState<TrainerSubscriptionResponse[]>([])
  const [draft, setDraft] = useState(blank)
  const [offer, setOffer] = useState<Record<number, { salePrice: string; startsAt: string; endsAt: string }>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [nextPackages, nextRequests] = await Promise.all([trainerApi.packages(), trainerApi.incoming()])
      setPackages(nextPackages); setRequests(nextRequests)
    } catch (requestError) { setError(getApiErrorMessage(requestError, 'We could not load your packages.')) }
  }, [])
  useEffect(() => { void load() }, [load])

  const packageRequest = (item: TrainerPackageResponse): TrainerPackageRequest => ({
    name: item.name, description: item.description ?? '', sessionsPerWeek: item.sessionsPerWeek,
    durationDays: item.durationDays, price: item.price, active: item.active,
  })

  const updateItem = (id: number, patch: Partial<TrainerPackageResponse>) => setPackages((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  const offerDraft = (item: TrainerPackageResponse) => offer[item.id] ?? { salePrice: Math.max(item.price - 5, .01).toFixed(2), startsAt: localDateTime(0), endsAt: localDateTime(30) }

  const createPackage = async () => {
    setBusy(-1); setError('')
    try { await trainerApi.createPackage(draft); setDraft(blank); await load() }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'The package could not be created.')) }
    finally { setBusy(null) }
  }

  const save = async (item: TrainerPackageResponse) => {
    setBusy(item.id); setError('')
    try { await trainerApi.updatePackage(item.id, packageRequest(item)); await load() }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'The package could not be saved.')) }
    finally { setBusy(null) }
  }

  const createOffer = async (item: TrainerPackageResponse) => {
    const value = offerDraft(item); setBusy(item.id); setError('')
    try { await trainerApi.createOffer(item.id, Number(value.salePrice), value.startsAt, value.endsAt); await load() }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'The offer could not be scheduled.')) }
    finally { setBusy(null) }
  }

  const cancelOffer = async (item: TrainerPackageResponse) => {
    if (!item.offer) return; setBusy(item.id); setError('')
    try { await trainerApi.cancelOffer(item.id, item.offer.id); await load() }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'The offer could not be stopped.')) }
    finally { setBusy(null) }
  }

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    setBusy(id); setError('')
    try { await trainerApi.decide(id, decision); await load() }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'The client request could not be updated.')) }
    finally { setBusy(null) }
  }

  return <div className={styles.wrap}>
    {error && <p className={styles.error}><CircleAlert /> {error}</p>}
    <section className={styles.panel}>
      <header><div><span>Client requests</span><h2>Paid requests waiting for you</h2></div><Clock3 /></header>
      <div className={styles.requests}>{requests.filter((item) => item.status === 'PENDING').map((item) => <article key={item.id}>
        <UserRound /><div><strong>{item.clientName}</strong><small>{item.clientEmail} · {item.trainerPackage.name}</small><b>Paid {item.payment.paidAmount.toFixed(2)} {item.payment.currency}</b></div>
        <button onClick={() => void decide(item.id, 'approve')} disabled={busy !== null}><Check /> Accept</button>
        <button onClick={() => void decide(item.id, 'reject')} disabled={busy !== null}><X /> Reject</button>
      </article>)}</div>
    </section>
    <section className={styles.panel}>
      <header><div><span>New package</span><h2>Publish a coaching plan</h2></div><PackagePlus /></header>
      <div className={styles.create}>
        <label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Price (EUR)<input type="number" min=".01" step=".01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
        <label>Sessions/week<input type="number" min="1" max="14" value={draft.sessionsPerWeek} onChange={(e) => setDraft({ ...draft, sessionsPerWeek: Number(e.target.value) })} /></label>
        <label>Duration days<input type="number" min="1" value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })} /></label>
        <label className={styles.description}>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <button onClick={() => void createPackage()} disabled={busy !== null || !draft.name.trim()}>{busy === -1 ? <LoaderCircle className={styles.spin} /> : <PackagePlus />} Create package</button>
      </div>
    </section>
    <section className={styles.panel}>
      <header><div><span>Public pricing</span><h2>Your trainer packages and sales</h2></div><Tag /></header>
      <div className={styles.packageGrid}>{packages.map((item) => <article key={item.id}>
        <label>Name<input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} /></label>
        <label>Price<input type="number" min=".01" step=".01" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })} /></label>
        <label>Sessions/week<input type="number" value={item.sessionsPerWeek} onChange={(e) => updateItem(item.id, { sessionsPerWeek: Number(e.target.value) })} /></label>
        <label>Days<input type="number" value={item.durationDays} onChange={(e) => updateItem(item.id, { durationDays: Number(e.target.value) })} /></label>
        <label className={styles.toggle}><input type="checkbox" checked={item.active} onChange={(e) => updateItem(item.id, { active: e.target.checked })} /> Available</label>
        <button onClick={() => void save(item)} disabled={busy !== null}><Save /> Save</button>
        <div className={styles.offerBox}>{item.offer ? <>
          <div className={styles.sale}><del>{item.offer.originalPrice.toFixed(2)} EUR</del><b>{item.effectivePrice.toFixed(2)} EUR</b></div>
          <small>{new Date(item.offer.startsAt).toLocaleString()} – {new Date(item.offer.endsAt).toLocaleString()}</small>
          <button onClick={() => void cancelOffer(item)}><Trash2 /> Stop sale</button>
        </> : <>
          <label>Sale price<input type="number" step=".01" value={offerDraft(item).salePrice} onChange={(e) => setOffer({ ...offer, [item.id]: { ...offerDraft(item), salePrice: e.target.value } })} /></label>
          <label>Starts<input type="datetime-local" value={offerDraft(item).startsAt} onChange={(e) => setOffer({ ...offer, [item.id]: { ...offerDraft(item), startsAt: e.target.value } })} /></label>
          <label>Ends<input type="datetime-local" value={offerDraft(item).endsAt} onChange={(e) => setOffer({ ...offer, [item.id]: { ...offerDraft(item), endsAt: e.target.value } })} /></label>
          <button onClick={() => void createOffer(item)}><Tag /> Schedule sale</button>
        </>}</div>
      </article>)}</div>
    </section>
  </div>
}
