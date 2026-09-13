import { useState, type FormEvent } from 'react'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  registrationRoles,
  validateRegistrationPasswords,
  type AuthResponse,
  type RegisterRequest,
  type UserRole,
} from '@swefton/shared/auth'
import { ArrowRight, Mail } from 'lucide-react'
import { FormField } from '../../../../components/ui/FormField'
import { PasswordField } from '../../../../components/ui/PasswordField'
import authStyles from '../../styles/AuthForm.module.css'
import { FormMessage } from '../FormMessage'
import { GoogleSignInButton } from '../GoogleSignInButton'
import styles from './RegisterForm.module.css'

interface RegisterFormProps {
  error: string
  notice: string
  pending: boolean
  onGoogleAuthenticated: (response: AuthResponse) => void
  onSubmit: (payload: RegisterRequest) => Promise<void>
}

export function RegisterForm({
  error,
  notice,
  pending,
  onGoogleAuthenticated,
  onSubmit,
}: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('USER')
  const [localError, setLocalError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateRegistrationPasswords(password, confirmPassword)

    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError('')
    void onSubmit({ email, password, role })
  }

  return (
    <form
      className={`${authStyles.authForm} ${authStyles.animated} ${styles.registerForm}`}
      onSubmit={handleSubmit}
    >
      <div className={`${authStyles.formHeading} ${styles.formHeading}`}>
        <span className={authStyles.sectionKicker}>Join the movement</span>
        <h2>Create your Swefton account</h2>
        <p>Set your goal in motion. It only takes a minute.</p>
      </div>

      <FormMessage error={localError || error} notice={notice} />

      <fieldset className={styles.rolePicker}>
        <legend>I’m joining as</legend>
        <div>
          {registrationRoles.map((option) => (
            <label
              key={option.value}
              className={role === option.value ? styles.selected : undefined}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
              />
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <GoogleSignInButton role={role} onAuthenticated={onGoogleAuthenticated} />
      <div className={authStyles.authDivider}>
        <span>or register with email</span>
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
        autoComplete="new-password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <PasswordField
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat your password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />

      <label className={`${authStyles.checkboxLabel} ${styles.consent}`}>
        <input type="checkbox" required />
        <span>I agree to Swefton’s Terms and Privacy Policy.</span>
      </label>

      <button className={authStyles.primaryButton} type="submit" disabled={pending}>
        <span>{pending ? 'Creating account…' : 'Create my account'}</span>
        {!pending && <ArrowRight />}
      </button>
    </form>
  )
}
