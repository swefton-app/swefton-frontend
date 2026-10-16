import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Mail } from 'lucide-react'
import { FormField } from '../../../../components/ui/FormField'
import { PasswordField } from '../../../../components/ui/PasswordField'
import authStyles from '../../styles/AuthForm.module.css'
import { FormMessage } from '../FormMessage'

interface Props {
  error: string
  notice: string
  pending: boolean
  email: string
  codeSent: boolean
  onBack: () => void
  onRequestCode: (email: string) => Promise<boolean>
  onReset: (payload: { email: string; code: string; newPassword: string; confirmPassword: string }) => Promise<void>
}

export function ForgotPasswordForm({ error, notice, pending, email: initialEmail, codeSent, onBack, onRequestCode, onReset }: Props) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [retrySeconds, setRetrySeconds] = useState(0)

  useEffect(() => {
    if (retrySeconds === 0) return
    const timeout = window.setTimeout(() => setRetrySeconds(retrySeconds - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [retrySeconds])

  const requestCode = async () => {
    if (await onRequestCode(email)) setRetrySeconds(60)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (codeSent) void onReset({ email, code, newPassword, confirmPassword })
    else void requestCode()
  }

  return (
    <form className={`${authStyles.authForm} ${authStyles.animated}`} onSubmit={submit}>
      <div className={authStyles.formHeading}>
        <span className={authStyles.sectionKicker}>Account recovery</span>
        <h2>{codeSent ? 'Choose a new password' : 'Forgot your password?'}</h2>
        <p>{codeSent ? `Enter the six-digit code for ${email}. Check your spam folder if it has not arrived.` : 'Enter your email and we will send you a secure verification code.'}</p>
      </div>
      <FormMessage error={error} notice={notice} />
      {!codeSent ? (
        <FormField label="Email address" icon={<Mail />} type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      ) : (
        <>
          <FormField label="Verification code" icon={<KeyRound />} type="text" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          <PasswordField label="New password" name="newPassword" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
          <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
        </>
      )}
      <button className={authStyles.primaryButton} type="submit" disabled={pending}>
        <span>{pending ? 'Please wait…' : codeSent ? 'Reset password' : 'Send verification code'}</span>{!pending && <ArrowRight />}
      </button>
      {codeSent && (
        <button className={authStyles.mutedAction} type="button" onClick={() => void requestCode()} disabled={pending || retrySeconds > 0}>
          {retrySeconds > 0 ? `Request another code in ${retrySeconds}s` : 'Send another code'}
        </button>
      )}
      <button className={authStyles.mutedAction} type="button" onClick={onBack}><ArrowLeft size={14} /> Back to sign in</button>
    </form>
  )
}
