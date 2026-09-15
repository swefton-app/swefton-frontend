import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import type { GenerateCvResponse } from '@swefton/shared/cv'
import type { TrainerDocumentResponse, UserProfileInput } from '@swefton/shared/onboarding'
import {
  Award,
  CheckCircle2,
  Eye,
  ShieldCheck,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react'
import { CvBuilder } from '../../../cv/pages/CvBuilderPage'
import formStyles from '../OnboardingForm.module.css'
import styles from './TrainerDocumentsStep.module.css'

interface TrainerDocumentsStepProps {
  cv: File | null
  generatedCv: TrainerDocumentResponse | null
  licence: File | null
  profile: UserProfileInput
  onChange: (type: 'cv' | 'licence', file: File | null) => void
  onGenerated: (document: TrainerDocumentResponse) => void
}

export function TrainerDocumentsStep({
  cv,
  generatedCv,
  licence,
  profile,
  onChange,
  onGenerated,
}: TrainerDocumentsStepProps) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderStarted, setBuilderStarted] = useState(false)

  useEffect(() => {
    if (!builderOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBuilderOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [builderOpen])

  const selectFile =
    (type: 'cv' | 'licence') => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) onChange(type, file)
      event.target.value = ''
    }

  const finishBuilder = (document: GenerateCvResponse) => {
    onGenerated(document)
  }

  const openBuilder = () => {
    setBuilderStarted(true)
    setBuilderOpen(true)
  }

  const cvRequirementText = generatedCv
    ? 'Your created CV is ready to use'
    : cv
      ? 'Your uploaded CV is ready to use'
      : 'Uploading and creating are both accepted for your CV'

  return (
    <div className={formStyles.stepContent}>
      <div className={styles.trustNote}>
        <ShieldCheck />
        <p><strong>Secure and confidential.</strong> Upload an existing CV or build one with Swefton.</p>
      </div>

      <section className={styles.cvSection}>
        <div className={styles.sectionHeading}>
          <div><span>Required</span><h3>Choose how to add your CV</h3></div>
          {(cv || generatedCv) && <small><CheckCircle2 /> CV ready</small>}
        </div>

        <div className={styles.cvChoices}>
          <label className={`${styles.choiceCard} ${cv ? styles.selectedChoice : ''}`}>
            <span className={styles.documentIcon}>{cv ? <CheckCircle2 /> : <UploadCloud />}</span>
            <strong>Upload a CV</strong>
            <small>{cv ? cv.name : 'Use a PDF, DOC or DOCX you already have'}</small>
            <span className={styles.uploadAction}>{cv ? 'Replace uploaded CV' : 'Choose a file'}</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={selectFile('cv')}
            />
          </label>

          <button
            className={`${styles.choiceCard} ${styles.createChoice} ${generatedCv ? styles.selectedChoice : ''}`}
            type="button"
            onClick={openBuilder}
          >
            <span className={styles.documentIcon}>{generatedCv ? <CheckCircle2 /> : <WandSparkles />}</span>
            <strong>{generatedCv ? 'CV created' : 'Create a CV'}</strong>
            <small>{generatedCv?.fileName ?? 'Answer a few questions and choose a template'}</small>
            <span className={styles.uploadAction}>
              {generatedCv ? <><Eye /> Preview or edit CV</> : 'Open CV builder'}
            </span>
          </button>
        </div>
      </section>

      <DocumentUpload
        icon={<Award />}
        title="Professional licence"
        description="PDF, JPG or PNG"
        file={licence}
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={selectFile('licence')}
      />

      <div className={styles.requirements}>
        <strong>Before you finish</strong>
        <span><CheckCircle2 /> {cvRequirementText}</span>
        <span><CheckCircle2 /> {licence ? 'Your professional licence is ready' : 'Your professional licence is still required'}</span>
        <span><CheckCircle2 /> Uploaded files must be clear and no larger than 20 MB</span>
      </div>

      {builderStarted && (
        <div
          className={`${styles.builderOverlay} ${builderOpen ? '' : styles.builderHidden}`}
          role="dialog"
          aria-modal="true"
          aria-label="Create your trainer CV"
          aria-hidden={!builderOpen}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBuilderOpen(false)
          }}
        >
          <div
            className={styles.builderModal}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                event.preventDefault()
              }
            }}
          >
            <button className={styles.closeBuilder} type="button" onClick={() => setBuilderOpen(false)} aria-label="Close CV builder"><X /></button>
            <CvBuilder
              embedded
              initialData={{
                firstName: profile.firstName,
                lastName: profile.lastName,
                professionalTitle: 'Personal Trainer',
                summary: profile.bio ?? '',
              }}
              onGenerated={finishBuilder}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface DocumentUploadProps {
  icon: ReactNode
  title: string
  description: string
  file: File | null
  accept: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

function DocumentUpload({ icon, title, description, file, accept, onChange }: DocumentUploadProps) {
  return (
    <label className={`${styles.uploadCard} ${file ? styles.uploaded : ''}`}>
      <span className={styles.documentIcon}>{file ? <CheckCircle2 /> : icon}</span>
      <span className={styles.uploadCopy}>
        <strong>{title} <b>*</b></strong>
        <small>{file ? file.name : description}</small>
      </span>
      <span className={styles.uploadAction}><UploadCloud /> {file ? 'Replace file' : 'Select file'}</span>
      <input type="file" accept={accept} onChange={onChange} />
    </label>
  )
}
