import type { TrainerDocumentResponse } from '../onboarding/contracts'

export type CvTemplate = 'MODERN' | 'PROFESSIONAL' | 'MINIMAL'
export type CvLanguageLevel =
  | 'NATIVE'
  | 'FLUENT'
  | 'ADVANCED'
  | 'INTERMEDIATE'
  | 'BASIC'

export interface CvExperience {
  company: string
  position: string
  startDate: string
  endDate?: string
  current: boolean
  description: string
}

export interface CvEducation {
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate?: string
  current: boolean
  description: string
}

export interface CvCertification {
  name: string
  issuer: string
  issueDate?: string
  expirationDate?: string
  credentialId: string
}

export interface CvLanguage {
  language: string
  level: CvLanguageLevel
}

export interface CvData {
  firstName: string
  lastName: string
  professionalTitle: string
  email: string
  phone: string
  city: string
  summary: string
  experiences: CvExperience[]
  education: CvEducation[]
  certifications: CvCertification[]
  skills: string[]
  languages: CvLanguage[]
}

export interface GenerateCvRequest extends CvData {
  template: CvTemplate
}

export type GenerateCvResponse = TrainerDocumentResponse
