import type { UserRole } from '../auth/contracts'

export type OnboardingStepId =
  | 'profile'
  | 'address'
  | 'preferences'
  | 'trainer-documents'

export interface OnboardingStep {
  id: OnboardingStepId
  eyebrow: string
  title: string
  description: string
}

const baseSteps: readonly OnboardingStep[] = [
  {
    id: 'profile',
    eyebrow: 'Your identity',
    title: 'Build your profile',
    description: 'Help the Swefton community know who they are training with.',
  },
  {
    id: 'address',
    eyebrow: 'Your location',
    title: 'Where are you based?',
    description: 'We use this to show useful local training and wellness options.',
  },
  {
    id: 'preferences',
    eyebrow: 'Make it yours',
    title: 'Choose your preferences',
    description: 'Control when and how Swefton keeps you in the loop.',
  },
]

const trainerDocumentsStep: OnboardingStep = {
  id: 'trainer-documents',
  eyebrow: 'Professional details',
  title: 'Verify your expertise',
  description: 'Upload or create your CV, then add your professional licence.',
}

export function getOnboardingSteps(role: UserRole): readonly OnboardingStep[] {
  return role === 'TRAINER'
    ? [baseSteps[0], trainerDocumentsStep, ...baseSteps.slice(1)]
    : baseSteps
}
