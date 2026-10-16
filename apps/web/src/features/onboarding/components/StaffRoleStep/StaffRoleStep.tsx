import type { FacilityStaffRole, FacilityStaffRoleOption } from '@swefton/shared/staff'
import { BriefcaseBusiness, Check, Dumbbell, Headphones, ShieldCheck, UserRoundCog, UsersRound } from 'lucide-react'
import formStyles from '../OnboardingForm.module.css'
import styles from './StaffRoleStep.module.css'

interface StaffRoleStepProps {
  facilityName?: string
  roles: FacilityStaffRoleOption[]
  value?: FacilityStaffRole
  onChange: (role: FacilityStaffRole) => void
}

const roleIcons: Record<FacilityStaffRole, typeof BriefcaseBusiness> = {
  MANAGER: UserRoundCog,
  RECEPTIONIST: Headphones,
  TRAINER: Dumbbell,
  INSTRUCTOR: Dumbbell,
  ADMINISTRATIVE_STAFF: ShieldCheck,
  GENERAL_STAFF: UsersRound,
}

const descriptions: Record<FacilityStaffRole, string> = {
  MANAGER: 'Coordinate daily facility operations and staff.',
  RECEPTIONIST: 'Support members and manage the front desk.',
  TRAINER: 'Coach members with a professional trainer profile.',
  INSTRUCTOR: 'Lead classes with trainer-style credentials and no pricing.',
  ADMINISTRATIVE_STAFF: 'Support administration and facility organisation.',
  GENERAL_STAFF: 'Join the wider operations and support team.',
}

export function StaffRoleStep({ facilityName, roles, value, onChange }: StaffRoleStepProps) {
  return (
    <div className={formStyles.stepContent}>
      {facilityName && <div className={styles.facility}><BriefcaseBusiness /><span>You are onboarding for</span><strong>{facilityName}</strong></div>}
      <div className={styles.grid}>
        {roles.map((role) => {
          const Icon = roleIcons[role.code]
          const selected = value === role.code
          return (
            <button key={role.code} className={selected ? styles.selected : ''} type="button" onClick={() => onChange(role.code)}>
              <span className={styles.icon}><Icon /></span>
              <span><strong>{role.label}</strong><small>{descriptions[role.code]}</small></span>
              <span className={styles.check}>{selected && <Check />}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
