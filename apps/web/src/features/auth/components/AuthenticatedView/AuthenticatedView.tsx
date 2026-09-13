import { Check } from 'lucide-react'
import authStyles from '../../styles/AuthForm.module.css'
import styles from './AuthenticatedView.module.css'

interface AuthenticatedViewProps {
  pending: boolean
  onLogout: () => Promise<void>
}

export function AuthenticatedView({ pending, onLogout }: AuthenticatedViewProps) {
  return (
    <section
      className={`${authStyles.authForm} ${authStyles.animated} ${styles.authenticatedView}`}
    >
      <div className={styles.successMark}>
        <Check />
      </div>
      <div className={authStyles.formHeading}>
        <span className={authStyles.sectionKicker}>You’re in</span>
        <h2>Welcome to Swefton</h2>
        <p>Your session is active. Your next workout is waiting for you.</p>
      </div>
      <div className={styles.sessionCard}>
        <span className={styles.statusDot} />
        <div>
          <strong>Secure session</strong>
          <span>Connected to your Swefton account</span>
        </div>
      </div>
      <button
        className={styles.secondaryButton}
        type="button"
        onClick={() => void onLogout()}
        disabled={pending}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  )
}
