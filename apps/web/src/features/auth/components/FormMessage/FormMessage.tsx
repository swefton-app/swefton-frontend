import styles from './FormMessage.module.css'

interface FormMessageProps {
  error: string
  notice: string
  role?: 'alert' | 'status'
}

export function FormMessage({ error, notice, role = 'status' }: FormMessageProps) {
  if (!error && !notice) return null

  return (
    <p
      className={`${styles.message} ${error ? styles.error : styles.notice}`}
      role={role}
    >
      {error || notice}
    </p>
  )
}
