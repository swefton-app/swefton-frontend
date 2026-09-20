import type { UserRole } from '../auth/contracts'

export type OnboardingRole = UserRole | 'STAFF'

export type OnboardingStepId =
  | 'profile'
  | 'address'
  | 'preferences'
  | 'trainer-documents'
  | 'business-licence'
  | 'facility-category'
  | 'gym-details'
  | 'staff-role'
  | 'staff-documents'

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

const businessLicenceStep: OnboardingStep = {
  id: 'business-licence',
  eyebrow: 'Business verification',
  title: 'Add your licence',
  description: 'If your business has a licence, add it now. You can also continue without one.',
}

const facilityCategoryStep: OnboardingStep = {
  id: 'facility-category',
  eyebrow: 'Facility category',
  title: 'What are you registering?',
  description: 'Choose the kind of facility you want to manage on Swefton.',
}

const gymDetailsStep: OnboardingStep = {
  id: 'gym-details',
  eyebrow: 'Gym registration',
  title: 'Create your gym',
  description: 'Add the public details and media customers will see.',
}

const staffRoleStep: OnboardingStep = {
  id: 'staff-role',
  eyebrow: 'Your position',
  title: 'How do you work at the facility?',
  description: 'Choose the staff role that best matches your responsibilities.',
}

const staffDocumentsStep: OnboardingStep = {
  id: 'staff-documents',
  eyebrow: 'Professional details',
  title: 'Add your CV',
  description: 'Upload an existing CV or create one with Swefton.',
}

export function getOnboardingSteps(role: OnboardingRole): readonly OnboardingStep[] {
  if (role === 'TRAINER') {
    return [baseSteps[0], trainerDocumentsStep, ...baseSteps.slice(1)]
  }
  if (role === 'FACILITY_OWNER') {
    return [
      facilityCategoryStep,
      baseSteps[0],
      businessLicenceStep,
      gymDetailsStep,
      baseSteps[2],
    ]
  }
  if (role === 'STAFF') {
    return [staffRoleStep, baseSteps[0], staffDocumentsStep, ...baseSteps.slice(1)]
  }
  return baseSteps
}
