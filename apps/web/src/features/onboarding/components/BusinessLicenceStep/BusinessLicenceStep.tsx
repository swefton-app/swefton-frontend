import type { ChangeEvent } from 'react'
import { BadgeCheck, FileCheck2, ShieldCheck, UploadCloud, X } from 'lucide-react'
import formStyles from '../OnboardingForm.module.css'
import styles from './BusinessLicenceStep.module.css'

interface BusinessLicenceStepProps {
  licence: File | null
  onChange: (file: File | null) => void
}

export function BusinessLicenceStep({ licence, onChange }: BusinessLicenceStepProps) {
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  return (
    <div className={formStyles.stepContent}>
      <div className={styles.note}>
        <ShieldCheck />
        <div>
          <strong>Licence upload is optional.</strong>
          <span>If your business has a registration or operating licence, it can help with verification.</span>
        </div>
      </div>

      <label className={`${styles.upload} ${licence ? styles.selected : ''}`}>
        <span className={styles.icon}>{licence ? <FileCheck2 /> : <BadgeCheck />}</span>
        <span className={styles.copy}>
          <strong>{licence ? licence.name : 'Business or professional licence'}</strong>
          <small>PDF, JPG or PNG · maximum 20 MB</small>
        </span>
        <span className={styles.action}><UploadCloud /> {licence ? 'Replace' : 'Choose file'}</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={selectFile}
        />
      </label>

      {licence && (
        <button className={styles.remove} type="button" onClick={() => onChange(null)}>
          <X /> Remove selected licence
        </button>
      )}
    </div>
  )
}
