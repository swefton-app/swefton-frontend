import { useEffect, useRef, useState } from 'react'
import type { AuthResponse, RoleCode } from '@swefton/shared/auth'
import { config } from '../../../../config'
import { authenticateWithGoogle } from '../../api/googleAuthApi'
import { FormMessage } from '../FormMessage'
import styles from './GoogleSignInButton.module.css'

interface GoogleSignInButtonProps {
  role?: RoleCode
  onAuthenticated: (response: AuthResponse) => void
}

export function GoogleSignInButton({ role, onAuthenticated }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<RoleCode | undefined>(role)
  const authenticatedRef = useRef(onAuthenticated)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    roleRef.current = role
  }, [role])

  useEffect(() => {
    authenticatedRef.current = onAuthenticated
  }, [onAuthenticated])

  useEffect(() => {
    const initialize = () => {
      if (!window.google || !containerRef.current || !config.googleClientId) return

      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (response) => {
          try {
            setError(null)
            const auth = await authenticateWithGoogle(response.credential, roleRef.current)
            authenticatedRef.current(auth)
          } catch (exception) {
            setError(
              exception instanceof Error
                ? exception.message
                : 'Google authentication failed',
            )
          }
        },
      })

      const container = containerRef.current
      container.innerHTML = ''
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: Math.min(Math.floor(container.getBoundingClientRect().width), 420),
      })
    }

    if (window.google) initialize()
    else window.onGoogleLibraryLoad = initialize

    return () => {
      window.onGoogleLibraryLoad = undefined
    }
  }, [])

  if (!config.googleClientId) {
    return (
      <div className={styles.googleAuth}>
        <button className={styles.unavailable} type="button" disabled>
          Google sign-in is not configured
        </button>
      </div>
    )
  }

  return (
    <div className={styles.googleAuth}>
      <div className={styles.buttonContainer} ref={containerRef} />
      {error && <FormMessage error={error} notice="" role="alert" />}
    </div>
  )
}
