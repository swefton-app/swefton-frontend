import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  VERIFICATION_CODE_LENGTH,
  type VerifyEmailRequest,
} from '@swefton/shared/auth'
import { ArrowRight, Mail } from 'lucide-react'
import authStyles from '../../styles/AuthForm.module.css'
import { FormMessage } from '../FormMessage'
import styles from './VerifyEmailForm.module.css'

interface VerifyEmailFormProps {
  email: string
  error: string
  notice: string
  pending: boolean
  onBack: () => void
  onResend: () => Promise<void>
  onSubmit: (payload: VerifyEmailRequest) => Promise<void>
}

export function VerifyEmailForm({
  email,
  error,
  notice,
  pending,
  onBack,
  onResend,
  onSubmit,
}: VerifyEmailFormProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array(VERIFICATION_CODE_LENGTH).fill(''),
  )
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const code = digits.join('')

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? digit : item)),
    )

    if (digit && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setDigits((current) =>
        current.map((item, itemIndex) => (itemIndex === index - 1 ? '' : item)),
      )
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedDigits = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, VERIFICATION_CODE_LENGTH)

    if (!pastedDigits) return

    event.preventDefault()
    setDigits(
      Array.from(
        { length: VERIFICATION_CODE_LENGTH },
        (_, index) => pastedDigits[index] ?? '',
      ),
    )
    inputRefs.current[
      Math.min(pastedDigits.length, VERIFICATION_CODE_LENGTH) - 1
    ]?.focus()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit({ email, code })
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-title"
      >
        <form
          className={`${authStyles.authForm} ${styles.verifyForm}`}
          onSubmit={handleSubmit}
        >
          <button
            className={styles.closeButton}
            type="button"
            onClick={onBack}
            aria-label="Close verification"
          >
            ×
          </button>
          <div className={styles.verificationIcon} aria-hidden="true">
            <Mail />
          </div>
          <div className={`${authStyles.formHeading} ${styles.formHeading}`}>
            <span className={authStyles.sectionKicker}>One last step</span>
            <h2 id="verification-title">Check your inbox</h2>
            <p>
              Enter the six-digit verification code sent to{' '}
              <strong>{email}</strong>.
            </p>
          </div>
          <FormMessage error={error} notice={notice} />
          <fieldset className={styles.codeField}>
            <legend>Verification code</legend>
            <div className={styles.codeInputs} onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element
                  }}
                  type="text"
                  name={`code-${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  aria-label={`Verification code digit ${index + 1}`}
                  required
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </fieldset>
          <button
            className={authStyles.primaryButton}
            type="submit"
            disabled={pending || code.length !== VERIFICATION_CODE_LENGTH}
          >
            <span>{pending ? 'Verifying…' : 'Verify email'}</span>
            {!pending && <ArrowRight />}
          </button>
          <p className={styles.resendCopy}>
            Didn’t receive it?{' '}
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={pending}
            >
              Resend code
            </button>
          </p>
          <button className={styles.backButton} type="button" onClick={onBack}>
            ← Back to sign in
          </button>
        </form>
      </div>
    </div>
  )
}
