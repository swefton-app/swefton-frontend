export const staffEndpoints = {
  facilityInvitations: (facilityId: number) => `/facilities/${facilityId}/staff-invitations`,
  publicInvitation: (token: string) => `/public/staff-invitations/${encodeURIComponent(token)}`,
  password: (token: string) => `/public/staff-invitations/${encodeURIComponent(token)}/password`,
  onboarding: '/staff/onboarding',
  onboardingContext: '/staff/onboarding/context',
  documents: '/staff/documents',
  generateCv: '/staff/documents/cv/generate',
} as const
