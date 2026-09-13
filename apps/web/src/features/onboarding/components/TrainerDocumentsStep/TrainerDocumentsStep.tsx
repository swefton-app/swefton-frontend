import type { ChangeEvent, ReactNode } from 'react'
import { Award, CheckCircle2, FileText, ShieldCheck, UploadCloud } from 'lucide-react'
import formStyles from '../OnboardingForm.module.css'
import styles from './TrainerDocumentsStep.module.css'

interface TrainerDocumentsStepProps {
  cv: File | null
  licence: File | null
  onChange: (type: 'cv' | 'licence', file: File | null) => void
}

export function TrainerDocumentsStep({ cv, licence, onChange }: TrainerDocumentsStepProps) {
  const selectFile =
    (type: 'cv' | 'licence') => (event: ChangeEvent<HTMLInputElement>) => {
      onChange(type, event.target.files?.[0] ?? null)
      event.target.value = ''
    }

  return (
    <div className={formStyles.stepContent}>
      <div className={styles.trustNote}>
        <ShieldCheck />
        <p><strong>Secure and confidential.</strong> Your documents are used only for trainer verification.</p>
      </div>

      <div className={styles.uploadGrid}>
        <DocumentUpload
          icon={<FileText />}
          title="Curriculum vitae"
          description="PDF, DOC or DOCX"
          file={cv}
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={selectFile('cv')}
        />
        <DocumentUpload
          icon={<Award />}
          title="Professional licence"
          description="PDF, JPG or PNG"
          file={licence}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={selectFile('licence')}
        />
      </div>

      <div className={styles.requirements}>
        <strong>Before you finish</strong>
        <span><CheckCircle2 /> Make sure names match your Swefton profile</span>
        <span><CheckCircle2 /> Files must be clear and no larger than 20 MB</span>
      </div>
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
      <strong>{title} <b>*</b></strong>
      <small>{file ? file.name : description}</small>
      <span className={styles.uploadAction}><UploadCloud /> {file ? 'Replace file' : 'Select file'}</span>
      <input type="file" accept={accept} onChange={onChange} />
    </label>
  )
}
