import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Building2, Check, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import type { StaffInvitationDetails } from '@swefton/shared/staff'
import sweftonMark from '../../../../assets/swefton-mark.png'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { tokenStorage } from '../../../../core/storage/tokenStorage'
import { staffApi } from '../../api/staffApi'
import styles from './StaffSetupPage.module.css'

export function StaffSetupPage() {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [invitation, setInvitation] = useState<StaffInvitationDetails | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(Boolean(token))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(token ? '' : 'This staff invitation link is incomplete.')

  useEffect(() => {
    if (!token) {
      return
    }
    let active = true
    void staffApi.invitationDetails(token)
      .then((data) => {
        if (active) setInvitation(data)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'This invitation is invalid or has expired.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const response = await staffApi.setPassword(token, password, confirmPassword)
      tokenStorage.save(response.authentication, true)
      window.location.replace('/onboarding/staff')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not create your staff account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <a href="/" className={styles.brand}><img src={sweftonMark} alt="" /><span>Swefton</span></a>
        <div className={styles.brandCopy}>
          <span>Staff invitation</span>
          <h1>Your place on the team starts here.</h1>
          <p>Create your private password first. Next, Swefton will guide you through the profile your facility needs.</p>
        </div>
        <ol>
          <li className={styles.active}><span>1</span><div><strong>Create password</strong><small>Secure your new account</small></div></li>
          <li><span>2</span><div><strong>Complete onboarding</strong><small>Choose your staff role and profile</small></div></li>
          <li><span>3</span><div><strong>Join the facility</strong><small>Start with your team</small></div></li>
        </ol>
      </section>

      <section className={styles.workspace}>
        <div className={styles.card}>
          {loading ? (
            <div className={styles.state}><LoaderCircle className={styles.spin} /><h2>Opening your invitation</h2><p>Checking your secure onboarding link.</p></div>
          ) : !invitation ? (
            <div className={styles.state}><CircleAlert /><h2>Invitation unavailable</h2><p>{error}</p><a href="/">Return to sign in</a></div>
          ) : (
            <form onSubmit={submit}>
              <header>
                <span className={styles.icon}><KeyRound /></span>
                <div><small>Step 1 of 2</small><h2>Create your password</h2><p>This password will be used to sign in to your Swefton staff account.</p></div>
              </header>

              <div className={styles.invitationSummary}>
                <Building2 />
                <div><small>You are joining</small><strong>{invitation.facilityName}</strong><span><Mail /> {invitation.email}</span></div>
                <Check />
              </div>

              <label>
                <span>Password</span>
                <div className={styles.passwordField}>
                  <LockKeyhole />
                  <input autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button>
                </div>
              </label>
              <label>
                <span>Confirm password</span>
                <div className={styles.passwordField}>
                  <LockKeyhole />
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Enter it again" />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}>{showConfirmPassword ? <EyeOff /> : <Eye />}</button>
                </div>
              </label>

              {error && <div className={styles.error} role="alert"><CircleAlert /> {error}</div>}

              <button className={styles.submit} type="submit" disabled={submitting || !password || !confirmPassword}>
                {submitting ? <><LoaderCircle className={styles.spin} /> Creating account…</> : <>Continue to onboarding <ArrowRight /></>}
              </button>
              <p className={styles.securityNote}>This invitation link is private, expires automatically, and can only be used once.</p>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
