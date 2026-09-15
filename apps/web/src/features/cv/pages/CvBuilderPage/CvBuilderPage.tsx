import { useEffect, useState, type ReactNode } from 'react'
import type {
  CvCertification,
  CvData,
  CvEducation,
  CvExperience,
  CvLanguage,
  CvLanguageLevel,
  CvTemplate,
  GenerateCvResponse,
} from '@swefton/shared/cv'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  Download,
  GraduationCap,
  Languages,
  LayoutTemplate,
  ListChecks,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { AppHeader } from '../../../../components/layout/AppHeader/AppHeader'
import { MonthPicker } from '../../../../components/ui/MonthPicker'
import { tokenStorage } from '../../../../core/storage/tokenStorage'
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage'
import { authApi } from '../../../auth/api/authApi'
import { dashboardApi } from '../../../dashboard/api/dashboardApi'
import { cvApi } from '../../api/cvApi'
import { CvPreview } from '../../components/CvPreview/CvPreview'
import styles from './CvBuilderPage.module.css'

const STEPS = [
  { label: 'Personal', icon: UserRound },
  { label: 'Summary', icon: Sparkles },
  { label: 'Experience', icon: BriefcaseBusiness },
  { label: 'Education', icon: GraduationCap },
  { label: 'Certificates', icon: Award },
  { label: 'Skills', icon: ListChecks },
  { label: 'Languages', icon: Languages },
  { label: 'Template', icon: LayoutTemplate },
] as const

const EMPTY_DATA: CvData = {
  firstName: '',
  lastName: '',
  professionalTitle: 'Personal Trainer',
  email: '',
  phone: '',
  city: '',
  summary: '',
  experiences: [],
  education: [],
  certifications: [],
  skills: [],
  languages: [],
}

const EMPTY_EXPERIENCE: CvExperience = {
  company: '', position: '', startDate: '', endDate: '', current: false, description: '',
}
const EMPTY_EDUCATION: CvEducation = {
  institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', current: false, description: '',
}
const EMPTY_CERTIFICATION: CvCertification = {
  name: '', issuer: '', issueDate: '', expirationDate: '', credentialId: '',
}
const EMPTY_LANGUAGE: CvLanguage = { language: '', level: 'ADVANCED' }

interface FieldProps {
  label: string
  children: ReactNode
  wide?: boolean
}

interface CvBuilderProps {
  embedded?: boolean
  initialData?: Partial<CvData>
  onGenerated?: (document: GenerateCvResponse) => void
}

function Field({ label, children, wide = false }: FieldProps) {
  return (
    <label className={wide ? styles.wideField : styles.field}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function CvBuilder({
  embedded = false,
  initialData,
  onGenerated,
}: CvBuilderProps) {
  const role = tokenStorage.getRole()
  const [data, setData] = useState<CvData>(() => ({
    ...EMPTY_DATA,
    ...initialData,
    experiences: initialData?.experiences ?? [],
    education: initialData?.education ?? [],
    certifications: initialData?.certifications ?? [],
    skills: initialData?.skills ?? [],
    languages: initialData?.languages ?? [],
  }))
  const [template, setTemplate] = useState<CvTemplate>('MODERN')
  const [step, setStep] = useState(0)
  const [skillDraft, setSkillDraft] = useState('')
  const [loadingPrefill, setLoadingPrefill] = useState(role === 'TRAINER' && !embedded)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GenerateCvResponse | null>(null)

  useEffect(() => {
    if (role !== 'TRAINER' || embedded) return
    let active = true
    void dashboardApi.get()
      .then((dashboard) => {
        if (!active) return
        setData((current) => ({
          ...current,
          firstName: dashboard.profile.firstName || current.firstName,
          lastName: dashboard.profile.lastName || current.lastName,
          city: dashboard.address.city || current.city,
          summary: dashboard.profile.bio || current.summary,
        }))
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingPrefill(false)
      })
    return () => { active = false }
  }, [embedded, role])

  const setValue = <K extends keyof CvData>(key: K, value: CvData[K]) => {
    setData((current) => ({ ...current, [key]: value }))
    setGenerated(null)
  }

  const updateExperience = (index: number, patch: Partial<CvExperience>) => {
    setValue('experiences', data.experiences.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ))
  }
  const updateEducation = (index: number, patch: Partial<CvEducation>) => {
    setValue('education', data.education.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ))
  }
  const updateCertification = (index: number, patch: Partial<CvCertification>) => {
    setValue('certifications', data.certifications.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ))
  }
  const updateLanguage = (index: number, patch: Partial<CvLanguage>) => {
    setValue('languages', data.languages.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ))
  }

  const addSkill = (value = skillDraft) => {
    const skill = value.trim()
    if (!skill || data.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return
    setValue('skills', [...data.skills, skill])
    setSkillDraft('')
  }

  const validateStep = (targetStep: number) => {
    if (targetStep === 0) {
      if (!data.firstName.trim() || !data.lastName.trim() || !data.professionalTitle.trim()) {
        return 'Add your name and professional title to continue.'
      }
      if (!/^\S+@\S+\.\S+$/.test(data.email)) return 'Enter a valid email address.'
    }
    if (targetStep === 2 && data.experiences.some((item) =>
      !item.company.trim() || !item.position.trim() || !item.startDate || (!item.current && !item.endDate),
    )) return 'Complete each experience entry or remove it.'
    if (targetStep === 3 && data.education.some((item) =>
      !item.institution.trim() || !item.degree.trim() || !item.startDate || (!item.current && !item.endDate),
    )) return 'Complete each education entry or remove it.'
    if (targetStep === 4 && data.certifications.some((item) => !item.name.trim())) {
      return 'Give each certification a name or remove it.'
    }
    if (targetStep === 6 && data.languages.some((item) => !item.language.trim())) {
      return 'Name each language or remove it.'
    }
    return null
  }

  const next = () => {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const generate = async () => {
    for (let index = 0; index < STEPS.length; index += 1) {
      const validationError = validateStep(index)
      if (validationError) {
        setStep(index)
        setError(validationError)
        return
      }
    }
    setGenerating(true)
    setGenerated(null)
    setError(null)
    try {
      const response = await cvApi.generate({ ...data, template })
      setGenerated(response)
      onGenerated?.(response)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'We could not generate your CV. Check your details and try again.'))
    } finally {
      setGenerating(false)
    }
  }

  const signOut = async () => {
    try { await authApi.logout() } catch { /* Local sign-out still completes. */ }
    tokenStorage.clear()
    window.location.replace('/')
  }

  if (role !== 'TRAINER') {
    return (
      <main className={styles.accessPage}>
        <section><h1>Trainer access required</h1><p>The CV builder is available to trainer accounts.</p><a href="/userDashboard">Back to dashboard</a></section>
      </main>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className={styles.formGrid}>
            <Field label="First name"><input value={data.firstName} maxLength={80} onChange={(event) => setValue('firstName', event.target.value)} /></Field>
            <Field label="Last name"><input value={data.lastName} maxLength={80} onChange={(event) => setValue('lastName', event.target.value)} /></Field>
            <Field label="Professional title" wide><input value={data.professionalTitle} maxLength={120} onChange={(event) => setValue('professionalTitle', event.target.value)} /></Field>
            <Field label="Email" wide><input type="email" value={data.email} maxLength={254} onChange={(event) => setValue('email', event.target.value)} placeholder="you@example.com" /></Field>
            <Field label="Phone"><input type="tel" value={data.phone} maxLength={40} onChange={(event) => setValue('phone', event.target.value)} /></Field>
            <Field label="City"><input value={data.city} maxLength={120} onChange={(event) => setValue('city', event.target.value)} /></Field>
          </div>
        )
      case 1:
        return <Field label="Professional summary" wide><textarea rows={10} maxLength={2000} value={data.summary} onChange={(event) => setValue('summary', event.target.value)} placeholder="Describe your coaching approach, strengths, and the clients you help." /></Field>
      case 2:
        return (
          <div className={styles.collection}>
            {data.experiences.map((item, index) => (
              <article className={styles.entryCard} key={index}>
                <button className={styles.removeButton} type="button" aria-label="Remove experience" onClick={() => setValue('experiences', data.experiences.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button>
                <div className={styles.formGrid}>
                  <Field label="Position"><input value={item.position} maxLength={120} onChange={(event) => updateExperience(index, { position: event.target.value })} /></Field>
                  <Field label="Company"><input value={item.company} maxLength={120} onChange={(event) => updateExperience(index, { company: event.target.value })} /></Field>
                  <Field label="Start"><MonthPicker value={item.startDate} label="Experience start" onChange={(value) => updateExperience(index, { startDate: value })} /></Field>
                  <Field label="End"><MonthPicker value={item.endDate ?? ''} label="Experience end" placeholder="Choose end month" disabled={item.current} onChange={(value) => updateExperience(index, { endDate: value })} /></Field>
                  <label className={styles.checkbox}><input type="checkbox" checked={item.current} onChange={(event) => updateExperience(index, { current: event.target.checked, endDate: event.target.checked ? '' : item.endDate })} /><span>Current role</span></label>
                  <Field label="What you accomplished" wide><textarea rows={4} maxLength={1500} value={item.description} onChange={(event) => updateExperience(index, { description: event.target.value })} /></Field>
                </div>
              </article>
            ))}
            <button className={styles.addButton} type="button" onClick={() => setValue('experiences', [...data.experiences, { ...EMPTY_EXPERIENCE }])}><Plus /> Add experience</button>
          </div>
        )
      case 3:
        return (
          <div className={styles.collection}>
            {data.education.map((item, index) => (
              <article className={styles.entryCard} key={index}>
                <button className={styles.removeButton} type="button" aria-label="Remove education" onClick={() => setValue('education', data.education.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button>
                <div className={styles.formGrid}>
                  <Field label="Institution"><input value={item.institution} maxLength={150} onChange={(event) => updateEducation(index, { institution: event.target.value })} /></Field>
                  <Field label="Degree"><input value={item.degree} maxLength={150} onChange={(event) => updateEducation(index, { degree: event.target.value })} /></Field>
                  <Field label="Field of study" wide><input value={item.fieldOfStudy} maxLength={150} onChange={(event) => updateEducation(index, { fieldOfStudy: event.target.value })} /></Field>
                  <Field label="Start"><MonthPicker value={item.startDate} label="Education start" onChange={(value) => updateEducation(index, { startDate: value })} /></Field>
                  <Field label="End"><MonthPicker value={item.endDate ?? ''} label="Education end" placeholder="Choose end month" disabled={item.current} onChange={(value) => updateEducation(index, { endDate: value })} /></Field>
                  <label className={styles.checkbox}><input type="checkbox" checked={item.current} onChange={(event) => updateEducation(index, { current: event.target.checked, endDate: event.target.checked ? '' : item.endDate })} /><span>Currently studying</span></label>
                  <Field label="Details" wide><textarea rows={3} maxLength={1000} value={item.description} onChange={(event) => updateEducation(index, { description: event.target.value })} /></Field>
                </div>
              </article>
            ))}
            <button className={styles.addButton} type="button" onClick={() => setValue('education', [...data.education, { ...EMPTY_EDUCATION }])}><Plus /> Add education</button>
          </div>
        )
      case 4:
        return (
          <div className={styles.collection}>
            {data.certifications.map((item, index) => (
              <article className={styles.entryCard} key={index}>
                <button className={styles.removeButton} type="button" aria-label="Remove certification" onClick={() => setValue('certifications', data.certifications.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button>
                <div className={styles.formGrid}>
                  <Field label="Certification name"><input value={item.name} maxLength={150} onChange={(event) => updateCertification(index, { name: event.target.value })} /></Field>
                  <Field label="Issuer"><input value={item.issuer} maxLength={150} onChange={(event) => updateCertification(index, { issuer: event.target.value })} /></Field>
                  <Field label="Issued"><MonthPicker value={item.issueDate ?? ''} label="Certification issue" placeholder="Choose issue month" onChange={(value) => updateCertification(index, { issueDate: value })} /></Field>
                  <Field label="Expires"><MonthPicker value={item.expirationDate ?? ''} label="Certification expiry" placeholder="Choose expiry month" onChange={(value) => updateCertification(index, { expirationDate: value })} /></Field>
                  <Field label="Credential ID" wide><input value={item.credentialId} maxLength={150} onChange={(event) => updateCertification(index, { credentialId: event.target.value })} /></Field>
                </div>
              </article>
            ))}
            <button className={styles.addButton} type="button" onClick={() => setValue('certifications', [...data.certifications, { ...EMPTY_CERTIFICATION }])}><Plus /> Add certification</button>
          </div>
        )
      case 5:
        {
          const suggestions = [
            'Strength Training',
            'Workout Programming',
            'Client Assessment',
            'Mobility & Flexibility',
            'Injury Prevention',
            'Nutrition Coaching',
          ].filter((suggestion) => !data.skills.some((skill) => skill.toLowerCase() === suggestion.toLowerCase()))
          return (
            <div className={styles.skillEditor}>
              <Field label="Add a skill" wide>
                <div className={styles.skillInputRow}>
                  <input
                    value={skillDraft}
                    maxLength={80}
                    onChange={(event) => setSkillDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="e.g. Olympic lifting"
                  />
                  <button type="button" onClick={() => addSkill()} disabled={!skillDraft.trim()}><Plus /> Add</button>
                </div>
              </Field>
              <div className={styles.skillChips} aria-label="Selected skills">
                {data.skills.length ? data.skills.map((skill) => (
                  <span className={styles.skillChip} key={skill}>
                    {skill}
                    <button type="button" onClick={() => setValue('skills', data.skills.filter((item) => item !== skill))} aria-label={`Remove ${skill}`}><X /></button>
                  </span>
                )) : <p className={styles.skillHint}>Add the strengths you want clients to notice.</p>}
              </div>
              {suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  <span>Suggested for trainers</span>
                  <div>{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => addSkill(suggestion)}><Plus /> {suggestion}</button>)}</div>
                </div>
              )}
            </div>
          )
        }
      case 6:
        return (
          <div className={styles.collection}>
            {data.languages.map((item, index) => (
              <article className={`${styles.entryCard} ${styles.languageRow}`} key={index}>
                <Field label="Language"><input value={item.language} maxLength={80} onChange={(event) => updateLanguage(index, { language: event.target.value })} /></Field>
                <Field label="Level"><select value={item.level} onChange={(event) => updateLanguage(index, { level: event.target.value as CvLanguageLevel })}><option value="NATIVE">Native</option><option value="FLUENT">Fluent</option><option value="ADVANCED">Advanced</option><option value="INTERMEDIATE">Intermediate</option><option value="BASIC">Basic</option></select></Field>
                <button className={styles.removeButton} type="button" aria-label="Remove language" onClick={() => setValue('languages', data.languages.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button>
              </article>
            ))}
            <button className={styles.addButton} type="button" onClick={() => setValue('languages', [...data.languages, { ...EMPTY_LANGUAGE }])}><Plus /> Add language</button>
          </div>
        )
      default:
        return (
          <div className={styles.templateGrid}>
            {(['MODERN', 'PROFESSIONAL', 'MINIMAL'] as CvTemplate[]).map((option) => (
              <button className={template === option ? styles.selectedTemplate : styles.templateCard} type="button" key={option} onClick={() => { setTemplate(option); setGenerated(null) }}>
                <span className={`${styles.templateThumbnail} ${styles[`thumbnail${option}`]}`}><i /><i /><i /></span>
                <strong>{option[0] + option.slice(1).toLowerCase()}</strong>
                <small>{option === 'MODERN' ? 'Bold color and a structured sidebar' : option === 'PROFESSIONAL' ? 'Refined, traditional, and polished' : 'Clean typography with generous space'}</small>
                {template === option && <Check aria-label="Selected" />}
              </button>
            ))}
          </div>
        )
    }
  }

  const workspace = (
      <main className={`${styles.workspace} ${embedded ? styles.embeddedWorkspace : ''}`}>
        <section className={styles.builder}>
          {!embedded && <a className={styles.backLink} href="/userDashboard"><ArrowLeft /> Back to studio</a>}
          <div className={styles.heading}><span>Professional documents</span><h1>Build your trainer CV</h1><p>Your answers stay in this browser until you generate the final PDF.</p></div>

          <ol className={styles.steps} aria-label="CV builder progress">
            {STEPS.map(({ label, icon: Icon }, index) => (
              <li key={label} className={index === step ? styles.currentStep : index < step ? styles.completedStep : undefined}>
                <button type="button" onClick={() => { if (index <= step) { setStep(index); setError(null) } }} aria-label={`Step ${index + 1}: ${label}`}><span>{index < step ? <Check /> : <Icon />}</span><small>{label}</small></button>
              </li>
            ))}
          </ol>

          <section className={styles.formPanel}>
            <header><span>Step {step + 1} of {STEPS.length}</span><h2>{STEPS[step].label}</h2></header>
            {loadingPrefill ? <div className={styles.loading}><LoaderCircle /> Loading your profile…</div> : renderStep()}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {generated && <div className={styles.success} role="status"><Check /><div><strong>CV generated and saved</strong><span>Review the preview, then close the builder when you are ready.</span></div></div>}
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" disabled={step === 0 || generating} onClick={() => { setStep((current) => Math.max(0, current - 1)); setError(null) }}><ArrowLeft /> Previous</button>
              {step < STEPS.length - 1 ? (
                <button className={styles.primaryButton} type="button" onClick={next}>Continue <ArrowRight /></button>
              ) : (
                <button className={styles.primaryButton} type="button" disabled={generating} onClick={() => void generate()}>{generating ? <LoaderCircle className={styles.spinner} /> : <Download />} {generating ? 'Generating PDF…' : generated ? 'Regenerate CV' : 'Generate CV'}</button>
              )}
            </footer>
          </section>
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.previewHeading}><div><span>{generated ? 'Final preview' : 'Live preview'}</span><strong>{template[0] + template.slice(1).toLowerCase()}</strong></div><small>{generated ? generated.fileName : 'No data is saved yet'}</small></div>
          <CvPreview data={data} template={template} />
        </aside>
      </main>
  )

  if (embedded) return <div className={styles.embeddedShell}>{workspace}</div>

  return (
    <div className={styles.shell}>
      <AppHeader context="Trainer studio" currentPage="CV Builder" onSignOut={signOut} />
      {workspace}
    </div>
  )
}

export function CvBuilderPage() {
  return <CvBuilder />
}
