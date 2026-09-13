interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (options: {
          client_id: string
          callback: (response: GoogleCredentialResponse) => void
        }) => void
        renderButton: (
          element: HTMLElement,
          options: {
            type?: 'standard' | 'icon'
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'small' | 'medium' | 'large'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            logo_alignment?: 'left' | 'center'
            width?: number
          },
        ) => void
        disableAutoSelect: () => void
      }
    }
  }
  onGoogleLibraryLoad?: () => void
}
