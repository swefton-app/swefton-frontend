import { useEffect, type FormEvent } from 'react'
import type { UserRole } from '@swefton/shared/auth'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleUserRound,
  MapPin,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { AppFooter } from '../../../../components/layout/AppFooter'
import { AppHeader } from '../../../../components/layout/AppHeader'
import { onboardingPrefillStorage } from '../../../../core/storage/onboardingPrefillStorage'
import { tokenStorage } from '../../../../core/storage/tokenStorage'
import { AddressStep } from '../../components/AddressStep/AddressStep'
import { PreferencesStep } from '../../components/PreferencesStep/PreferencesStep'
import { ProfileStep } from '../../components/ProfileStep/ProfileStep'
import { TrainerDocumentsStep } from '../../components/TrainerDocumentsStep/TrainerDocumentsStep'
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow'
import styles from './OnboardingPage.module.css'

const stepIcons = {
  profile: CircleUserRound,
  'trainer-documents': BadgeCheck,
  address: MapPin,
  preferences: Settings2,
} as const

function roleFromPath(): UserRole {
  if (window.location.pathname.endsWith('/trainer')) return 'TRAINER'
  if (window.location.pathname.endsWith('/facility')) return 'FACILITY_OWNER'
  return 'USER'
}

const roleLabels: Record<UserRole, string> = {
  USER: 'Member setup',
  TRAINER: 'Trainer setup',
  FACILITY_OWNER: 'Business setup',
}

export function OnboardingPage() {
  const role = roleFromPath()
  const flow = useOnboardingFlow(role)
  const activeStep = flow.steps[flow.stepIndex]
  const ActiveIcon = stepIcons[activeStep.id]
  const isLastStep = flow.stepIndex === flow.steps.length - 1
  const progressPercent = ((flow.stepIndex + 1) / flow.steps.length) * 100

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) window.location.replace('/')
  }, [])

  if (!tokenStorage.getAccessToken()) return null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    flow.next()
  }

  const logout = () => {
    tokenStorage.clear()
    onboardingPrefillStorage.clear()
    window.location.assign('/')
  }

  return (
    <div className={styles.page}>
      <AppHeader context={roleLabels[role]} onSignOut={logout} />
      <main className={styles.layout}>
        <aside className={styles.sidebar}>

        <div className={styles.sidebarIntro}>
          <span>{roleLabels[role]}</span>
          <h1>Let’s get you<br />ready to move.</h1>
          <p>A few details now will make your Swefton experience feel like yours.</p>
        </div>

        <nav className={styles.timeline} aria-label="Onboarding progress">
          {flow.steps.map((step, index) => {
            const Icon = stepIcons[step.id]
            const isComplete = index < flow.stepIndex
            const isActive = index === flow.stepIndex
            return (
              <div
                key={step.id}
                className={`${styles.timelineItem} ${isActive ? styles.active : ''} ${isComplete ? styles.complete : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={styles.timelineIcon}>{isComplete ? <Check /> : <Icon />}</span>
                <span><strong>{step.title}</strong><small>Step {index + 1}</small></span>
              </div>
            )
          })}
        </nav>

        <div className={styles.sidebarQuote}>
          <Sparkles />
          <p>Small steps become strong habits.</p>
        </div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <span className={styles.stepCount}>Step {flow.stepIndex + 1} of {flow.steps.length}</span>
          </header>

        <div className={styles.mobileProgress}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.cardWrap}>
          <form className={styles.card} onSubmit={handleSubmit}>
            <header className={styles.cardHeader}>
              <span className={styles.headerIcon}><ActiveIcon /></span>
              <div>
                <span className={styles.eyebrow}>{activeStep.eyebrow}</span>
                <h2>{activeStep.title}</h2>
                <p>{activeStep.description}</p>
              </div>
            </header>

            <div key={activeStep.id} className={styles.stepAnimation}>
              {activeStep.id === 'profile' && (
                <ProfileStep
                  role={role}
                  value={flow.profile}
                  errors={flow.profileErrors}
                  image={flow.profileImage}
                  googlePictureUrl={flow.googlePictureUrl}
                  onChange={flow.setProfile}
                  onImageChange={flow.setProfileImage}
                  onGooglePictureRemove={flow.removeGooglePicture}
                />
              )}
              {activeStep.id === 'address' && (
                <AddressStep
                  value={flow.address}
                  errors={flow.addressErrors}
                  onChange={flow.setAddress}
                />
              )}
              {activeStep.id === 'preferences' && (
                <PreferencesStep
                  value={flow.preferences}
                  errors={flow.preferencesErrors}
                  onChange={flow.setPreferences}
                />
              )}
              {activeStep.id === 'trainer-documents' && (
                <TrainerDocumentsStep
                  cv={flow.cv}
                  generatedCv={flow.generatedCv}
                  licence={flow.licence}
                  profile={flow.profile}
                  onChange={flow.setDocument}
                  onGenerated={flow.setGeneratedCv}
                />
              )}
            </div>

            {(flow.error || flow.progress) && (
              <div className={flow.error ? styles.errorMessage : styles.progressMessage} role={flow.error ? 'alert' : 'status'}>
                {flow.error || flow.progress}
              </div>
            )}

            <footer className={styles.cardFooter}>
              <button
                className={styles.backButton}
                type="button"
                onClick={flow.stepIndex === 0 ? logout : flow.back}
                disabled={flow.pending}
              >
                <ArrowLeft /> {flow.stepIndex === 0 ? 'Back to sign in' : 'Back'}
              </button>
              <button className={styles.nextButton} type="submit" disabled={flow.pending}>
                <span>{flow.pending ? 'Saving your setup…' : isLastStep ? 'Finish setup' : 'Continue'}</span>
                {!flow.pending && <ArrowRight />}
              </button>
            </footer>
          </form>
          <p className={styles.saveNote}>Your information is encrypted and securely stored.</p>
        </div>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}
