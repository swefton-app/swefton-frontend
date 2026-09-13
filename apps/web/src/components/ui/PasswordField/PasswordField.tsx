import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { FormField } from '../FormField'
import styles from './PasswordField.module.css'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function PasswordField({ label, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <FormField
      {...inputProps}
      label={label}
      type={visible ? 'text' : 'password'}
      icon={<LockKeyhole />}
      trailing={
        <button
          className={styles.visibilityButton}
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  )
}
