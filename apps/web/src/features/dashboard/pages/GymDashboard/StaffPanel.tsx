import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { FacilityStaffInvitation } from '@swefton/shared/staff'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Clock3,
  KeyRound,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { staffApi } from '../../../staff/api/staffApi'
import styles from './StaffPanel.module.css'

interface StaffPanelProps {
  facilityId: number
  facilityName: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

export function StaffPanel({ facilityId, facilityName }: StaffPanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [invitations, setInvitations] = useState<FacilityStaffInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [listError, setListError] = useState('')

  const normalizedEmail = email.trim().toLowerCase()
  const pendingCount = invitations.filter((item) => item.status === 'PENDING' || item.status === 'ACCOUNT_CREATED').length
  const activeCount = invitations.filter((item) => item.status === 'COMPLETED').length
  const invitedEmails = useMemo(
    () => new Set(invitations.map((invitation) => invitation.email)),
    [invitations],
  )

  useEffect(() => {
    let active = true
    void staffApi.invitations(facilityId)
      .then((data) => {
        if (active) setInvitations(data.filter((item) => item.status !== 'REVOKED'))
      })
      .catch((requestError) => {
        if (active) setListError(getApiErrorMessage(requestError, 'We could not load staff invitations.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [facilityId])

  const openInvite = () => {
    setEmail('')
    setError('')
    setMessage('')
    setInviteOpen(true)
  }

  const closeInvite = () => {
    setInviteOpen(false)
    setEmail('')
    setError('')
  }

  const submitInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!emailPattern.test(normalizedEmail)) {
      setError('Enter a valid staff email address.')
      return
    }
    if (invitedEmails.has(normalizedEmail)) {
      setError('This email already has a pending invitation for this facility.')
      return
    }

    setSubmitting(true)
    try {
      const invitation = await staffApi.invite(facilityId, normalizedEmail)
      setInvitations((current) => [invitation, ...current.filter((item) => item.id !== invitation.id)])
      setEmail('')
      setMessage(`Invitation sent to ${normalizedEmail}.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not send this invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  const removeInvitation = async (id: number) => {
    setListError('')
    try {
      await staffApi.revoke(facilityId, id)
      setInvitations((current) => current.filter((invitation) => invitation.id !== id))
    } catch (requestError) {
      setListError(getApiErrorMessage(requestError, 'We could not cancel this invitation.'))
    }
  }

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>People and access</span>
          <h2>Build the team behind {facilityName}</h2>
          <p>
            Start with an email address. The invited person opens the onboarding link, creates
            a password, and then completes the profile required for their staff role.
          </p>
        </div>
        <button type="button" onClick={openInvite}>
          <UserPlus aria-hidden="true" /> Add staff member
        </button>
      </section>

      <section className={styles.metrics} aria-label="Staff invitation summary">
        <article>
          <span><UsersRound aria-hidden="true" /></span>
          <div><small>Team members</small><strong>{activeCount}</strong><p>Activated profiles</p></div>
        </article>
        <article>
          <span><Clock3 aria-hidden="true" /></span>
          <div><small>Pending</small><strong>{pendingCount}</strong><p>Awaiting account setup</p></div>
        </article>
        <article>
          <span><ShieldCheck aria-hidden="true" /></span>
          <div><small>Access</small><strong>Invite only</strong><p>Owner or administrator</p></div>
        </article>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Facility directory</span>
              <h3>Staff and invitations</h3>
            </div>
            <span>{pendingCount} pending</span>
          </header>

          {loading ? (
            <div className={styles.empty}><LoaderCircle className={styles.spin} /><h4>Loading staff invitations</h4></div>
          ) : listError ? (
            <div className={styles.empty}><CircleAlert /><h4>Staff list unavailable</h4><p>{listError}</p></div>
          ) : invitations.length === 0 ? (
            <div className={styles.empty}>
              <span><UsersRound aria-hidden="true" /></span>
              <h4>No staff members yet</h4>
              <p>Invite the first person who works at this facility using only their email.</p>
              <button type="button" onClick={openInvite}>Invite first staff member <ArrowRight /></button>
            </div>
          ) : (
            <div className={styles.invitationList}>
              {invitations.map((invitation) => (
                <article key={invitation.id}>
                  <span className={styles.avatar}>{initials(invitation.email)}</span>
                  <div>
                    <strong>{invitation.email}</strong>
                    <small>Invited to {facilityName} · {new Date(invitation.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small>
                  </div>
                  <span className={styles.pending}><Clock3 /> {invitation.status === 'COMPLETED' ? 'Onboarded' : invitation.status === 'ACCOUNT_CREATED' ? 'Profile pending' : 'Invitation sent'}</span>
                  {invitation.status !== 'COMPLETED' ? (
                    <button
                      type="button"
                      onClick={() => void removeInvitation(invitation.id)}
                      aria-label={`Cancel invitation for ${invitation.email}`}
                      title="Cancel invitation"
                    >
                      <X />
                    </button>
                  ) : <span />}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.flowPanel}>
          <span className={styles.eyebrow}>Invitation journey</span>
          <h3>What happens next</h3>
          <ol>
            <li>
              <span><Mail /></span>
              <div><strong>Invitation email</strong><p>The staff member receives an email with a secure “Start onboarding” button that opens account setup.</p></div>
            </li>
            <li>
              <span><KeyRound /></span>
              <div><strong>Create password</strong><p>The onboarding link opens the password setup screen before any profile information is requested.</p></div>
            </li>
            <li>
              <span><BriefcaseBusiness /></span>
              <div><strong>Complete onboarding</strong><p>Instructors use the trainer flow without pricing. Other roles use a standard profile with an uploaded or created CV.</p></div>
            </li>
          </ol>
          <div className={styles.emailAction}>
            <span><Mail aria-hidden="true" /> Invitation email button</span>
            <strong>Start onboarding <ArrowRight aria-hidden="true" /></strong>
          </div>
          <div className={styles.policy}>
            <Check aria-hidden="true" />
            <p><strong>Email first</strong><span>No personal or professional details are entered by the facility owner.</span></p>
          </div>
        </aside>
      </div>

      {inviteOpen && (
        <div className={styles.backdrop} role="presentation" onMouseDown={closeInvite}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-staff-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <span><UserPlus aria-hidden="true" /></span>
              <div>
                <small>New staff invitation</small>
                <h3 id="invite-staff-title">Add someone to {facilityName}</h3>
              </div>
              <button type="button" onClick={closeInvite} aria-label="Close staff invitation"><X /></button>
            </header>

            <form onSubmit={submitInvitation} noValidate>
              <div className={styles.notice}>
                <Mail aria-hidden="true" />
                <p><strong>You only need their email.</strong><span>The invitation email takes them directly to password setup and then their onboarding steps.</span></p>
              </div>

              <label>
                <span>Staff email address</span>
                <div className={error ? styles.invalidField : ''}>
                  <Mail aria-hidden="true" />
                  <input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError('')
                      setMessage('')
                    }}
                    placeholder="name@example.com"
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'staff-email-error' : undefined}
                  />
                </div>
                {error && <small id="staff-email-error" className={styles.error}><CircleAlert /> {error}</small>}
              </label>

              {message && <div className={styles.success} role="status"><Check /> {message}</div>}

              <div className={styles.dialogActions}>
                <button type="button" onClick={closeInvite}>Cancel</button>
                <button type="submit" disabled={!email.trim() || submitting}>{submitting ? <LoaderCircle className={styles.spin} /> : <Send />}{submitting ? 'Sending…' : 'Send invitation'}</button>
              </div>
            </form>

            <footer>
              <ShieldCheck aria-hidden="true" /> Invitation access is scoped to facility #{facilityId}.
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
