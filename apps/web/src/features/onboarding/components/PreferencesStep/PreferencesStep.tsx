import type {
  FieldErrors,
  UserPreferencesInput,
} from '@swefton/shared/onboarding'
import { BellRing, Clock3, Mail, Megaphone } from 'lucide-react'
import { Select, type SelectOption } from '../../../../components/ui/Select'
import formStyles from '../OnboardingForm.module.css'
import styles from './PreferencesStep.module.css'

interface PreferencesStepProps {
  value: UserPreferencesInput
  errors: FieldErrors<UserPreferencesInput>
  onChange: (value: UserPreferencesInput) => void
}

const timezones = [
  'Europe/Tirane',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
] as const

const timezoneOptions: readonly SelectOption[] = timezones.map((timezone) => ({
  value: timezone,
  label: timezone.replaceAll('_', ' ').replace('/', ' / '),
}))

export function PreferencesStep({ value, errors, onChange }: PreferencesStepProps) {
  const update = <Key extends keyof UserPreferencesInput>(
    key: Key,
    nextValue: UserPreferencesInput[Key],
  ) => onChange({ ...value, [key]: nextValue })
  const availableTimezones = timezoneOptions.some(
    (timezone) => timezone.value === value.timezone,
  )
    ? timezoneOptions
    : [
        {
          value: value.timezone,
          label: value.timezone.replaceAll('_', ' ').replace('/', ' / '),
        },
        ...timezoneOptions,
      ]

  return (
    <div className={formStyles.stepContent}>
      <label className={formStyles.field}>
        <span>Timezone <b>*</b></span>
        <Select
          value={value.timezone}
          options={availableTimezones}
          onChange={(timezone) => update('timezone', timezone)}
          ariaLabel="Choose timezone"
          icon={<Clock3 />}
          invalid={Boolean(errors.timezone)}
        />
        {errors.timezone && <small className={formStyles.error}>{errors.timezone}</small>}
      </label>

      <div className={styles.preferenceList}>
        <PreferenceToggle
          icon={<BellRing />}
          title="Push notifications"
          description="Workout reminders, booking updates and live activity."
          checked={value.pushNotifications}
          onChange={(checked) => update('pushNotifications', checked)}
        />
        <PreferenceToggle
          icon={<Mail />}
          title="Email notifications"
          description="Account news, weekly progress and important updates."
          checked={value.emailNotifications}
          onChange={(checked) => update('emailNotifications', checked)}
        />
        <PreferenceToggle
          icon={<Megaphone />}
          title="Tips and offers"
          description="Occasional training ideas, product news and promotions."
          checked={value.marketingNotifications}
          onChange={(checked) => update('marketingNotifications', checked)}
        />
      </div>
      <p className={styles.privacyCopy}>You can change these choices at any time in Settings.</p>
    </div>
  )
}

interface PreferenceToggleProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function PreferenceToggle({ icon, title, description, checked, onChange }: PreferenceToggleProps) {
  return (
    <label className={styles.preferenceCard}>
      <span className={styles.preferenceIcon}>{icon}</span>
      <span className={styles.preferenceCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.switch} aria-hidden="true" />
    </label>
  )
}
