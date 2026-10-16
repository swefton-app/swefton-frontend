import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GymMembershipResponse, MembershipPlanRequest, MembershipPlanResponse } from '@swefton/shared/membership'
import { Check, CheckCircle2, CircleAlert, Clock3, LoaderCircle, Pencil, Plus, Save, Tag, Trash2, UsersRound, X } from 'lucide-react'
import { DatePicker } from '../../../../components/ui/DatePicker'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { gymMembershipApi } from '../../api/gymMembershipApi'
import styles from './MembershipsPanel.module.css'

interface MembershipsPanelProps {
  facilityId: number
  facilityName: string
  view?: 'memberships' | 'plans'
}

interface OfferDraft { salePrice: string; startsAt: string; endsAt: string }

type MembershipPlanDraft = Omit<MembershipPlanRequest, 'visitsPerWeek' | 'durationMonths' | 'price'> & {
  visitsPerWeek: number | ''
  durationMonths: number | ''
  price: number | ''
}

const emptyPlan: MembershipPlanDraft = {
  visitsPerWeek: 3,
  durationMonths: 1,
  price: 30,
  currency: 'EUR',
  active: true,
}

const currencies = ['EUR', 'ALL', 'USD', 'GBP', 'CHF'] as const

function localDate(daysFromNow: number) {
  const value = new Date(Date.now() + daysFromNow * 86_400_000)
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 10)
}

function discountPercentage(plan: MembershipPlanResponse) {
  if (!plan.offer || plan.offer.originalPrice <= 0) return 0
  return Math.round((1 - plan.offer.salePrice / plan.offer.originalPrice) * 100)
}

export function MembershipsPanel({ facilityId, facilityName, view = 'memberships' }: MembershipsPanelProps) {
  const [plans, setPlans] = useState<MembershipPlanResponse[]>([])
  const [memberships, setMemberships] = useState<GymMembershipResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [offerDrafts, setOfferDrafts] = useState<Record<number, OfferDraft>>({})
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planDraft, setPlanDraft] = useState<MembershipPlanDraft>(emptyPlan)
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null)
  const [editPlanDraft, setEditPlanDraft] = useState<MembershipPlanDraft>(emptyPlan)
  const [offerEditorPlanId, setOfferEditorPlanId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (view === 'plans') {
        setPlans(await gymMembershipApi.ownerPlans(facilityId))
      } else {
        setMemberships(await gymMembershipApi.ownerMemberships(facilityId))
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, view === 'plans'
        ? 'We could not load plans for this facility.'
        : 'We could not load memberships for this gym.'))
    } finally {
      setLoading(false)
    }
  }, [facilityId, view])

  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => memberships.filter((membership) => membership.status === 'PENDING'), [memberships])
  const active = useMemo(() => memberships.filter((membership) => membership.status === 'ACTIVE'), [memberships])
  const planGroups = useMemo(() => {
    const months = [...new Set(plans.map((plan) => plan.durationMonths))].sort((a, b) => a - b)
    return months.map((durationMonths) => ({
      durationMonths,
      plans: plans.filter((plan) => plan.durationMonths === durationMonths),
    }))
  }, [plans])

  const createPlan = async () => {
    setBusyId(-2)
    setError('')
    try {
      await gymMembershipApi.createPlan(facilityId, {
        ...planDraft,
        visitsPerWeek: Number(planDraft.visitsPerWeek),
        durationMonths: Number(planDraft.durationMonths),
        price: Number(planDraft.price),
        currency: planDraft.currency.trim().toUpperCase(),
      })
      await load()
      setPlanDraft(emptyPlan)
      setShowPlanForm(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not add this membership plan.'))
    } finally {
      setBusyId(null)
    }
  }

  const openPlanEditor = (plan: MembershipPlanResponse) => {
    setEditPlanDraft({
      visitsPerWeek: plan.visitsPerWeek ?? 7,
      durationMonths: plan.durationMonths,
      price: plan.price,
      currency: plan.currency,
      active: plan.active,
    })
    setEditingPlanId(plan.id)
  }

  const savePlan = async (planId: number) => {
    setBusyId(planId)
    setError('')
    try {
      await gymMembershipApi.updatePlan(facilityId, planId, {
        ...editPlanDraft,
        visitsPerWeek: Number(editPlanDraft.visitsPerWeek),
        durationMonths: Number(editPlanDraft.durationMonths),
        price: Number(editPlanDraft.price),
        currency: editPlanDraft.currency.trim().toUpperCase(),
      })
      await load()
      setEditingPlanId(null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not save this plan.'))
    } finally {
      setBusyId(null)
    }
  }

  const deletePlan = async (plan: MembershipPlanResponse) => {
    if (!window.confirm(`Delete the ${plan.name} plan? Existing memberships will be preserved.`)) return
    setBusyId(plan.id)
    setError('')
    try {
      await gymMembershipApi.deletePlan(facilityId, plan.id)
      await load()
      if (editingPlanId === plan.id) setEditingPlanId(null)
      if (offerEditorPlanId === plan.id) setOfferEditorPlanId(null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not delete this plan.'))
    } finally {
      setBusyId(null)
    }
  }

  const offerDraft = (plan: MembershipPlanResponse) => offerDrafts[plan.id] ?? {
    salePrice: Math.max(plan.price - 5, 0.01).toFixed(2),
    startsAt: localDate(0),
    endsAt: localDate(30),
  }

  const updateOfferDraft = (plan: MembershipPlanResponse, patch: Partial<OfferDraft>) => {
    setOfferDrafts((current) => ({ ...current, [plan.id]: { ...offerDraft(plan), ...patch } }))
  }

  const openOfferEditor = (plan: MembershipPlanResponse) => {
    if (plan.offer) {
      setOfferDrafts((current) => ({
        ...current,
        [plan.id]: {
          salePrice: plan.offer!.salePrice.toFixed(2),
          startsAt: plan.offer!.startsAt.slice(0, 10),
          endsAt: plan.offer!.endsAt.slice(0, 10),
        },
      }))
    }
    setOfferEditorPlanId(plan.id)
  }

  const saveOffer = async (plan: MembershipPlanResponse) => {
    const draft = offerDraft(plan)
    setBusyId(plan.id)
    setError('')
    try {
      const values = [facilityId, plan.id, Number(draft.salePrice), `${draft.startsAt}T00:00:00`, `${draft.endsAt}T23:59:59`] as const
      if (plan.offer) {
        await gymMembershipApi.updatePlanOffer(values[0], values[1], plan.offer.id, values[2], values[3], values[4])
      } else {
        await gymMembershipApi.createPlanOffer(...values)
      }
      setOfferEditorPlanId(null)
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not schedule this offer.'))
    } finally {
      setBusyId(null)
    }
  }

  const cancelOffer = async (plan: MembershipPlanResponse) => {
    if (!plan.offer) return
    setBusyId(plan.id)
    setError('')
    try {
      await gymMembershipApi.cancelPlanOffer(facilityId, plan.id, plan.offer.id)
      setOfferEditorPlanId(null)
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not delete this discount.'))
    } finally {
      setBusyId(null)
    }
  }

  const decide = async (membership: GymMembershipResponse, decision: 'approve' | 'reject') => {
    setBusyId(membership.id)
    setError('')
    try {
      const updated = await gymMembershipApi.decideMembership(facilityId, membership.id, decision)
      setMemberships((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, `We could not ${decision} this request.`))
    } finally {
      setBusyId(null)
    }
  }

  if (loading && (view === 'plans' ? !plans.length : !memberships.length)) {
    return <div className={styles.state}><LoaderCircle className={styles.spin} /><strong>Loading {view === 'plans' ? 'facility plans' : 'membership operations'}…</strong></div>
  }

  return (
    <div className={styles.content}>
      {view === 'memberships' && <section className={styles.summary}>
        <div><span><UsersRound /></span><strong>{active.length}</strong><small>Active members</small></div>
        <div><span><Clock3 /></span><strong>{pending.length}</strong><small>Waiting approval</small></div>
        <div><span><CheckCircle2 /></span><strong>{active.filter((membership) => membership.checkedIn).length}</strong><small>Inside now</small></div>
      </section>}

      {error && <p className={styles.error} role="alert"><CircleAlert /> {error}</p>}

      {view === 'memberships' && <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span className={styles.kicker}>Requests</span><h2>Membership approvals</h2></div><b>{pending.length} pending</b></header>
          {pending.length ? (
            <div className={styles.requestList}>
              {pending.map((membership) => (
                <article key={membership.id}>
                  <span className={styles.avatar}>{membership.memberName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <div><strong>{membership.memberName}</strong><small>{membership.memberEmail}</small><p>{membership.plan.name} · {membership.plan.price.toFixed(2)} {membership.plan.currency}</p></div>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => void decide(membership, 'approve')} disabled={busyId !== null}>{busyId === membership.id ? <LoaderCircle className={styles.spin} /> : <Check />} Accept</button>
                    <button type="button" onClick={() => void decide(membership, 'reject')} disabled={busyId !== null}><X /> Reject</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className={styles.empty}><CheckCircle2 /><strong>All caught up</strong><span>New membership requests will appear here.</span></div>}
        </section>
      </div>}

      {view === 'plans' && <section className={styles.panel}>
        <header>
          <div><span className={styles.kicker}>Pricing</span><h2>Facility membership plans</h2></div>
          <button className={styles.addButton} type="button" onClick={() => setShowPlanForm((current) => !current)}>
            {showPlanForm ? <X /> : <Plus />} {showPlanForm ? 'Close' : 'Add plan'}
          </button>
        </header>

        {showPlanForm && (
          <form className={styles.planForm} onSubmit={(event) => { event.preventDefault(); void createPlan() }}>
            <div><span className={styles.kicker}>New plan</span><strong>Create a membership option</strong></div>
            <label>Days per week<input required type="number" min="1" max="7" value={planDraft.visitsPerWeek} onChange={(event) => setPlanDraft({ ...planDraft, visitsPerWeek: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
            <label>Duration in months<input required type="number" min="1" max="36" value={planDraft.durationMonths} onChange={(event) => setPlanDraft({ ...planDraft, durationMonths: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
            <label>Price<input required type="number" min="0.01" step="0.01" value={planDraft.price} onChange={(event) => setPlanDraft({ ...planDraft, price: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
            <label>Currency<select value={planDraft.currency} onChange={(event) => setPlanDraft({ ...planDraft, currency: event.target.value })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
            <label className={styles.toggle}><input type="checkbox" checked={planDraft.active} onChange={(event) => setPlanDraft({ ...planDraft, active: event.target.checked })} /><span>Available to users</span></label>
            <button type="submit" disabled={busyId !== null}>{busyId === -2 ? <LoaderCircle className={styles.spin} /> : <Plus />} Add membership plan</button>
          </form>
        )}

        {planGroups.length ? (
          <div className={styles.planGroups}>
            {planGroups.map((group) => (
              <section className={styles.planGroup} key={group.durationMonths}>
                <header><span>{group.durationMonths} {group.durationMonths === 1 ? 'month' : 'months'}</span><small>{group.plans.length} {group.plans.length === 1 ? 'plan' : 'plans'}</small></header>
                <div className={styles.planGrid}>
                  {group.plans.map((plan) => (
                    <article key={plan.id}>
                      <span>{plan.durationMonths}M</span>
                      {editingPlanId === plan.id ? (
                        <>
                          <label>Days / week<input required type="number" min="1" max="7" value={editPlanDraft.visitsPerWeek} onChange={(event) => setEditPlanDraft({ ...editPlanDraft, visitsPerWeek: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
                          <label>Months<input required type="number" min="1" max="36" value={editPlanDraft.durationMonths} onChange={(event) => setEditPlanDraft({ ...editPlanDraft, durationMonths: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
                          <label>Price<input required type="number" min="0.01" step="0.01" value={editPlanDraft.price} onChange={(event) => setEditPlanDraft({ ...editPlanDraft, price: event.target.value === '' ? '' : event.target.valueAsNumber })} /></label>
                          <label>Currency<select value={editPlanDraft.currency} onChange={(event) => setEditPlanDraft({ ...editPlanDraft, currency: event.target.value })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
                          <label className={styles.toggle}><input type="checkbox" checked={editPlanDraft.active} onChange={(event) => setEditPlanDraft({ ...editPlanDraft, active: event.target.checked })} /><span>Available</span></label>
                          <div className={styles.planActions}>
                            <button type="button" onClick={() => void savePlan(plan.id)} disabled={busyId !== null}>{busyId === plan.id ? <LoaderCircle className={styles.spin} /> : <Save />} Save</button>
                            <button type="button" onClick={() => setEditingPlanId(null)} disabled={busyId !== null}><X /> Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.planOverview}>
                            <div><small>Training access</small><strong>{plan.visitsPerWeek ?? 7} days / week</strong></div>
                            <div><small>Duration</small><strong>{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</strong></div>
                            <div><small>Price</small><strong>{plan.price.toFixed(2)} {plan.currency}</strong></div>
                            <span className={plan.active ? styles.availableStatus : styles.hiddenStatus}>{plan.active ? 'Available' : 'Hidden'}</span>
                          </div>
                          <div className={styles.planActions}>
                            <button type="button" onClick={() => openPlanEditor(plan)} disabled={busyId !== null}><Pencil /> Modify</button>
                            <button type="button" onClick={() => void deletePlan(plan)} disabled={busyId !== null}><Trash2 /> Delete</button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : <div className={styles.empty}><Plus /><strong>No plans yet</strong><span>Add the first membership plan for this facility.</span></div>}
      </section>}

      {view === 'plans' && <section className={`${styles.panel} ${styles.discountPanel}`}>
        <header>
          <div><span className={styles.kicker}>Discounts</span><h2>Plan discount campaigns</h2></div>
          <b>{plans.filter((plan) => plan.offer?.active).length} active · {plans.filter((plan) => plan.offer && !plan.offer.active).length} scheduled</b>
        </header>
        <p className={styles.help}>Discounts are managed separately from regular plan prices. They appear on the public facility profile only between their start and end dates.</p>
        <div className={styles.discountGroups}>
          {planGroups.map((group) => (
            <section className={styles.discountGroup} key={group.durationMonths}>
              <header><span>{group.durationMonths} {group.durationMonths === 1 ? 'month' : 'months'}</span><small>{group.plans.length} eligible {group.plans.length === 1 ? 'plan' : 'plans'}</small></header>
              <div className={styles.discountGrid}>
                {group.plans.map((plan) => (
                  <article key={plan.id}>
                    <div className={styles.discountPlanHeading}>
                      <div><span>{plan.name}</span><small>{plan.visitsPerWeek ?? 7} days per week</small></div>
                      <strong>{plan.price.toFixed(2)} {plan.currency}</strong>
                    </div>

                    {offerEditorPlanId === plan.id ? (
                      <div className={styles.offerForm}>
                        <div className={styles.editorHeading}><strong>{plan.offer ? 'Modify discount' : 'Add discount'}</strong><button type="button" onClick={() => setOfferEditorPlanId(null)} aria-label="Close discount editor"><X /></button></div>
                        <label>Discount price<input required type="number" min="0.01" max={Math.max(plan.price - 0.01, 0.01)} step="0.01" value={offerDraft(plan).salePrice} onChange={(event) => updateOfferDraft(plan, { salePrice: event.target.value })} /></label>
                        <div className={styles.dateField}>
                          <span>Start date</span>
                          <DatePicker
                            value={offerDraft(plan).startsAt}
                            onChange={(startsAt) => updateOfferDraft(plan, {
                              startsAt,
                              endsAt: offerDraft(plan).endsAt > startsAt ? offerDraft(plan).endsAt : '',
                            })}
                            label="Discount start date"
                            min={localDate(0)}
                            allowFuture
                            placeholder="Choose start date"
                            tone="light"
                          />
                        </div>
                        <div className={styles.dateField}>
                          <span>End date</span>
                          <DatePicker
                            value={offerDraft(plan).endsAt}
                            onChange={(endsAt) => updateOfferDraft(plan, { endsAt })}
                            label="Discount end date"
                            min={offerDraft(plan).startsAt || localDate(0)}
                            allowFuture
                            placeholder="Choose end date"
                            tone="light"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void saveOffer(plan)}
                          disabled={busyId !== null
                            || !offerDraft(plan).startsAt
                            || !offerDraft(plan).endsAt
                            || offerDraft(plan).endsAt <= offerDraft(plan).startsAt
                            || Number(offerDraft(plan).salePrice) <= 0
                            || Number(offerDraft(plan).salePrice) >= plan.price}
                        >
                          {busyId === plan.id
                            ? <LoaderCircle className={styles.spin} />
                            : plan.offer ? <Save /> : <Tag />}
                          {plan.offer ? 'Save discount' : 'Add discount'}
                        </button>
                      </div>
                    ) : plan.offer ? (
                      <div className={styles.activeOffer}>
                        <div className={styles.discountMeta}>
                          <span className={`${styles.discountStatus} ${plan.offer.status === 'SCHEDULED' ? styles.scheduledStatus : ''}`}>
                            <Tag /> {plan.offer.status === 'ACTIVE' ? 'Discount active' : 'Discount scheduled'}
                          </span>
                          <strong className={styles.savings}>{discountPercentage(plan)}% off</strong>
                        </div>
                        <div className={styles.discountPrices}><del>{plan.offer.originalPrice.toFixed(2)} {plan.currency}</del><b>{plan.offer.salePrice.toFixed(2)} {plan.currency}</b></div>
                        <div className={styles.discountDates}>
                          <span><small>Starts</small><b>{new Date(plan.offer.startsAt).toLocaleDateString()}</b></span>
                          <span><small>Ends</small><b>{new Date(plan.offer.endsAt).toLocaleDateString()}</b></span>
                        </div>
                        <div className={styles.discountActions}>
                          <button type="button" onClick={() => openOfferEditor(plan)} disabled={busyId !== null}><Pencil /> Modify</button>
                          <button type="button" onClick={() => void cancelOffer(plan)} disabled={busyId !== null}><Trash2 /> Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.discountEmpty}>
                        <Tag />
                        <span>No discount on this plan</span>
                        <button type="button" onClick={() => openOfferEditor(plan)} disabled={busyId !== null}><Plus /> Add discount</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!planGroups.length && <div className={styles.empty}><Tag /><strong>No plans available</strong><span>Add a facility plan before creating a discount.</span></div>}
        </div>
      </section>}

      {view === 'memberships' && <section className={styles.panel}>
        <header><div><span className={styles.kicker}>Members</span><h2>Active at {facilityName}</h2></div><b>{active.length} people</b></header>
        {active.length ? <div className={styles.memberList}>{active.map((membership) => <article key={membership.id}><span className={styles.avatar}>{membership.memberName.slice(0, 1).toUpperCase()}</span><div><strong>{membership.memberName}</strong><small>{membership.plan.name}</small></div><b>{membership.remainingEntriesThisWeek ?? '∞'} left</b><span className={membership.checkedIn ? styles.inside : styles.outside}>{membership.checkedIn ? 'Inside' : 'Outside'}</span></article>)}</div> : <div className={styles.empty}><UsersRound /><strong>No active members yet</strong><span>Approved memberships will be listed here.</span></div>}
      </section>}
    </div>
  )
}
