import type { FacilityCategory } from '@swefton/shared/onboarding'
import { Activity, Building2, CheckCircle2, Dumbbell, Heart, Shield, Waves, Zap } from 'lucide-react'
import formStyles from '../OnboardingForm.module.css'
import styles from './FacilityCategoryStep.module.css'

interface FacilityCategoryStepProps {
  value: FacilityCategory | ''
  onChange: (value: FacilityCategory) => void
  tone?: 'dark' | 'light'
}

const categories: readonly {
  value: FacilityCategory
  label: string
  description: string
  icon: typeof Building2
}[] = [
  { value: 'GYM', label: 'Gym', description: 'Fitness centers, strength gyms and training studios.', icon: Dumbbell },
  { value: 'SWIMMING', label: 'Swimming', description: 'Pools, swim schools and aquatic training facilities.', icon: Waves },
  { value: 'BOXING', label: 'Boxing', description: 'Boxing clubs, rings and combat conditioning spaces.', icon: Shield },
  { value: 'MARTIAL_ARTS', label: 'Martial arts', description: 'Dojo, MMA and specialist martial arts academies.', icon: Activity },
  { value: 'YOGA', label: 'Yoga', description: 'Yoga, mobility and mindful movement studios.', icon: Heart },
  { value: 'CROSSFIT', label: 'CrossFit', description: 'CrossFit boxes and functional fitness facilities.', icon: Zap },
]

export function FacilityCategoryStep({ value, onChange, tone = 'dark' }: FacilityCategoryStepProps) {
  return (
    <div className={`${formStyles.stepContent} ${styles[tone]}`}>
      <div className={styles.categoryGrid}>
        {categories.map(({ value: category, label, description, icon: Icon }) => (
          <button
            className={`${styles.category} ${value === category ? styles.selected : ''}`}
            type="button"
            key={category}
            onClick={() => onChange(category)}
          >
            <span className={styles.icon}><Icon /></span>
            <span className={styles.copy}>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <span className={styles.check}>{value === category ? <CheckCircle2 /> : <Building2 />}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
