import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode
  label: string
  trailing?: ReactNode
}

export function FormField({
  icon,
  label,
  trailing,
  className = '',
  ...inputProps
}: FormFieldProps) {
  return (
    <label className={`${styles.formField} ${className}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.inputShell}>
        <span className={styles.fieldIcon} aria-hidden="true">
          {icon}
        </span>
        <input {...inputProps} />
        {trailing}
      </span>
    </label>
  )
}
