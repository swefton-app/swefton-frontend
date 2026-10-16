import { LockKeyhole } from 'lucide-react'
import logoMark from '../../../assets/swefton-mark.png'
import styles from './AppFooter.module.css'

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.message}>
          <img src={logoMark} alt="" />
          <div>
            <strong>Swefton</strong>
            <span>Built for better movement.</span>
          </div>
        </div>

        <div className={styles.trust}>
          <span><i aria-hidden="true" /> Signed-in session</span>
          <span><LockKeyhole aria-hidden="true" /> Your data is securely protected</span>
        </div>

        <p>© {new Date().getFullYear()} Swefton. All rights reserved.</p>
      </div>
    </footer>
  )
}
