import { useState, type FormEvent } from 'react'
import type { AuthResponse, LoginRequest } from '@swefton/shared/auth'
import { ArrowRight, Mail } from 'lucide-react'
import { FormField } from '../../../../components/ui/FormField'
import { PasswordField } from '../../../../components/ui/PasswordField'
import authStyles from '../../styles/AuthForm.module.css'
import { FormMessage } from '../FormMessage'
import { GoogleSignInButton } from '../GoogleSignInButton'

interface LoginFormProps {
  error: string
  notice: string
  pending: boolean
  onGoogleAuthenticated: (response: AuthResponse) => void
  onSubmit: (payload: LoginRequest, keepSignedIn: boolean) => Promise<void>
}

export function LoginForm({
  error,
  notice,
  pending,
  onGoogleAuthenticated,
  onSubmit,
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ email, password }, keepSignedIn)
  }

  return (
    <form
      className={`${authStyles.authForm} ${authStyles.animated}`}
      onSubmit={handleSubmit}
    >
      <div className={authStyles.formHeading}>
        <span className={authStyles.sectionKicker}>Welcome back</span>
        <h2>Ready for your next win?</h2>
        <p>Sign in and pick up right where you left off.</p>
      </div>

      <FormMessage error={error} notice={notice} />

      <GoogleSignInButton onAuthenticated={onGoogleAuthenticated} />
      <div className={authStyles.authDivider}>
        <span>or continue with email</span>
      </div>

      <FormField
        label="Email address"
        icon={<Mail />}
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <div className={authStyles.formOptions}>
        <label className={authStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(event) => setKeepSignedIn(event.target.checked)}
          />
          <span>Keep me signed in</span>
        </label>
        <span className={authStyles.mutedAction} title="Password recovery is coming soon">
          Forgot password?
        </span>
      </div>

      <button className={authStyles.primaryButton} type="submit" disabled={pending}>
        <span>{pending ? 'Signing in…' : 'Log in to Swefton'}</span>
        {!pending && <ArrowRight />}
      </button>
    </form>
  )
}
