import logoMark from '../../../../assets/swefton-mark.png'
import wordmark from '../../../../assets/swefton-wordmark.png'
import { Check } from 'lucide-react'
import styles from './BrandPanel.module.css'

export function BrandPanel() {
  return (
    <aside className={styles.brandPanel}>
      <div className={`${styles.aurora} ${styles.auroraOne}`} />
      <div className={`${styles.aurora} ${styles.auroraTwo}`} />

      <img className={styles.wordmark} src={wordmark} alt="Swefton" />

      <div className={styles.message}>
        <span className={styles.eyebrow}>
          <span /> Your stronger life starts here
        </span>
        <h1>
          <span className={styles.headlineLine}>Move better.</span>
          <span className={`${styles.headlineLine} ${styles.headlineAccent}`}>
            Live stronger.
          </span>
        </h1>
        <p>
          One place to train with purpose, track every win, and connect with
          the people who keep you moving.
        </p>

        <div className={styles.benefits} aria-label="Swefton benefits">
          <span><Check /> Smart training</span>
          <span><Check /> Real progress</span>
          <span><Check /> Your community</span>
        </div>
      </div>

      <div className={styles.progressCard}>
        <img src={logoMark} alt="" />
        <div>
          <span>This week</span>
          <strong>4 / 5 workouts</strong>
        </div>
        <div className={styles.progressRing}><span>80%</span></div>
      </div>

      <p className={styles.footer}>Train · Transform · Thrive</p>
    </aside>
  )
}
