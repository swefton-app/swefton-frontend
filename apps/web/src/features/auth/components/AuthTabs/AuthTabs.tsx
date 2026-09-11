import type { AuthView } from '../../hooks/useAuthFlow'
import styles from './AuthTabs.module.css'

interface AuthTabsProps {
  activeView: AuthView
  onChange: (view: AuthView) => void
}

export function AuthTabs({ activeView, onChange }: AuthTabsProps) {
  return (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label="Account access"
      data-active={activeView === 'register' ? 'register' : 'login'}
    >
      <button
        type="button"
        role="tab"
        id="login-tab"
        aria-controls="login-panel"
        aria-selected={activeView === 'login'}
        className={activeView === 'login' ? styles.active : undefined}
        onClick={() => onChange('login')}
      >
        Log in
      </button>
      <button
        type="button"
        role="tab"
        id="register-tab"
        aria-controls="register-panel"
        aria-selected={activeView === 'register'}
        className={activeView === 'register' ? styles.active : undefined}
        onClick={() => onChange('register')}
      >
        Create account
      </button>
    </div>
  )
}
