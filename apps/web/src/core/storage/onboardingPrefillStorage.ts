import type { OnboardingPrefill } from '@swefton/shared/onboarding'

const PREFILL_KEY = 'swefton.onboardingPrefill'

export const onboardingPrefillStorage = {
  get(): OnboardingPrefill | undefined {
    const value = sessionStorage.getItem(PREFILL_KEY)
    if (!value) return undefined

    try {
      return JSON.parse(value) as OnboardingPrefill
    } catch {
      sessionStorage.removeItem(PREFILL_KEY)
      return undefined
    }
  },

  save(prefill: OnboardingPrefill) {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill))
  },

  clear() {
    sessionStorage.removeItem(PREFILL_KEY)
  },
}
