import { LogOut } from 'lucide-react'
import logoWordmark from '../../../assets/swefton-wordmark.png'
import styles from './AppHeader.module.css'

interface AppHeaderProps {
  context: string
  currentPage?: string
  onSignOut: () => void
}

export function AppHeader({
  context,
  currentPage,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/userDashboard" aria-label="Swefton dashboard">
          <span className={styles.logoViewport}>
            <img src={logoWordmark} alt="Swefton" />
          </span>
        </a>

        <div className={styles.divider} aria-hidden="true" />
        <span className={styles.context}>{context}</span>

        {currentPage && (
          <nav className={styles.navigation} aria-label="Primary navigation">
            <a href="/userDashboard" aria-current="page">
              {currentPage}
            </a>
          </nav>
        )}

        <button className={styles.signOut} type="button" onClick={onSignOut}>
          <LogOut aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  )
}
