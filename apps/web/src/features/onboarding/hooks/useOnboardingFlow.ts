import { useMemo, useRef, useState } from 'react'
import type { UserRole } from '@swefton/shared/auth'
import {
  getOnboardingSteps,
  hasFieldErrors,
  validateAddress,
  validatePreferences,
  validateProfile,
  type FieldErrors,
  type OnboardingPrefill,
  type OnboardingRequest,
  type TrainerDocumentResponse,
  type UserAddressInput,
  type UserPreferencesInput,
  type UserProfileInput,
} from '@swefton/shared/onboarding'
import { getApiErrorMessage } from '../../../core/http/getApiErrorMessage'
import { onboardingPrefillStorage } from '../../../core/storage/onboardingPrefillStorage'
import { onboardingApi, imageUrlToFile } from '../api/onboardingApi'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

interface UploadedAssets {
  avatar: boolean
  cv: boolean
  licence: boolean
}

function getTrainerDocumentsError(cvReady: boolean, licenceReady: boolean) {
  if (!cvReady && !licenceReady) {
    return 'Upload or create your CV, then add your professional licence to continue.'
  }
  if (!cvReady) return 'Upload or create your CV to continue.'
  if (!licenceReady) return 'Add your professional licence to continue.'
  return ''
}

function initialProfile(prefill?: OnboardingPrefill): UserProfileInput {
  return {
    firstName: prefill?.firstName ?? '',
    lastName: prefill?.lastName ?? '',
    displayName: '',
    dateOfBirth: '',
    bio: '',
  }
}

function cleanPayload(
  profile: UserProfileInput,
  address: UserAddressInput,
  preferences: UserPreferencesInput,
): OnboardingRequest {
  const optionalText = (value?: string) => value?.trim() || undefined

  return {
    profile: {
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      displayName: optionalText(profile.displayName),
      dateOfBirth: optionalText(profile.dateOfBirth),
      gender: profile.gender,
      bio: optionalText(profile.bio),
      experience: profile.experience,
      price: profile.price,
    },
    address: {
      addressLine: address.addressLine.trim(),
      city: address.city.trim(),
      state: optionalText(address.state),
      postalCode: optionalText(address.postalCode),
      country: address.country.trim(),
    },
    preferences,
  }
}

export function useOnboardingFlow(role: UserRole) {
  const prefill = useMemo(() => onboardingPrefillStorage.get(), [])
  const steps = useMemo(() => getOnboardingSteps(role), [role])
  const [stepIndex, setStepIndex] = useState(0)
  const [profile, setProfile] = useState<UserProfileInput>(() => initialProfile(prefill))
  const [address, setAddress] = useState<UserAddressInput>({
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })
  const [preferences, setPreferences] = useState<UserPreferencesInput>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    pushNotifications: true,
    emailNotifications: true,
    marketingNotifications: false,
  })
  const [profileImage, setProfileImageState] = useState<File | null>(null)
  const [googlePictureUrl, setGooglePictureUrl] = useState(prefill?.pictureUrl)
  const [cv, setCvState] = useState<File | null>(null)
  const [generatedCv, setGeneratedCvState] = useState<TrainerDocumentResponse | null>(null)
  const [licence, setLicenceState] = useState<File | null>(null)
  const [profileErrors, setProfileErrors] = useState<FieldErrors<UserProfileInput>>({})
  const [addressErrors, setAddressErrors] = useState<FieldErrors<UserAddressInput>>({})
  const [preferencesErrors, setPreferencesErrors] = useState<
    FieldErrors<UserPreferencesInput>
  >({})
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [pending, setPending] = useState(false)
  const uploaded = useRef<UploadedAssets>({ avatar: false, cv: false, licence: false })

  const setProfileImage = (file: File | null) => {
    if (file && file.size > MAX_IMAGE_SIZE) {
      setError('Profile images must be 10 MB or smaller.')
      return
    }
    setError('')
    setProfileImageState(file)
    if (file) setGooglePictureUrl(undefined)
    uploaded.current.avatar = false
  }

  const setDocument = (type: 'cv' | 'licence', file: File | null) => {
    if (file && file.size > MAX_DOCUMENT_SIZE) {
      setError('Trainer documents must be 20 MB or smaller.')
      return
    }
    setError('')
    if (type === 'cv') {
      setCvState(file)
      setGeneratedCvState(null)
    } else setLicenceState(file)
    uploaded.current[type] = false
  }

  const setGeneratedCv = (document: TrainerDocumentResponse) => {
    setError('')
    setCvState(null)
    setGeneratedCvState(document)
    uploaded.current.cv = true
  }

  const removeGooglePicture = () => {
    setGooglePictureUrl(undefined)
    uploaded.current.avatar = false
  }

  const validateCurrentStep = () => {
    const step = steps[stepIndex]
    if (step.id === 'profile') {
      const errors = validateProfile(profile)
      setProfileErrors(errors)
      return !hasFieldErrors(errors)
    }
    if (step.id === 'address') {
      const errors = validateAddress(address)
      setAddressErrors(errors)
      return !hasFieldErrors(errors)
    }
    if (step.id === 'preferences') {
      const errors = validatePreferences(preferences)
      setPreferencesErrors(errors)
      return !hasFieldErrors(errors)
    }
    const documentsError = getTrainerDocumentsError(Boolean(cv || generatedCv), Boolean(licence))
    if (documentsError) {
      setError(documentsError)
      return false
    }
    return true
  }

  const submit = async () => {
    setPending(true)
    setError('')

    try {
      if (!uploaded.current.avatar && (profileImage || googlePictureUrl)) {
        setProgress('Uploading your profile photo…')
        const image = profileImage ?? (await imageUrlToFile(googlePictureUrl!))
        await onboardingApi.uploadProfileImage(image)
        uploaded.current.avatar = true
      }

      if (role === 'TRAINER') {
        const documentsError = getTrainerDocumentsError(Boolean(cv || generatedCv), Boolean(licence))
        if (documentsError) throw new Error(documentsError)
        if (!licence) throw new Error('Add your professional licence to continue.')

        if (!uploaded.current.cv && cv) {
          setProgress('Uploading your CV…')
          await onboardingApi.uploadTrainerDocument(cv, 'CV')
          uploaded.current.cv = true
        }
        if (!uploaded.current.licence) {
          setProgress('Uploading your professional licence…')
          await onboardingApi.uploadTrainerDocument(licence, 'LICENCE')
          uploaded.current.licence = true
        }
      }

      setProgress('Finishing your Swefton profile…')
      await onboardingApi.complete(cleanPayload(profile, address, preferences))
      onboardingPrefillStorage.clear()
      window.location.assign('/userDashboard')
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          requestError instanceof Error
            ? requestError.message
            : 'We could not finish your profile. Please try again.',
        ),
      )
      setProgress('')
    } finally {
      setPending(false)
    }
  }

  const next = () => {
    setError('')
    if (!validateCurrentStep()) return
    if (stepIndex === steps.length - 1) void submit()
    else setStepIndex((current) => current + 1)
  }

  const back = () => {
    setError('')
    setStepIndex((current) => Math.max(0, current - 1))
  }

  return {
    address,
    addressErrors,
    back,
    cv,
    error,
    generatedCv,
    googlePictureUrl,
    licence,
    next,
    pending,
    preferences,
    preferencesErrors,
    profile,
    profileErrors,
    profileImage,
    progress,
    removeGooglePicture,
    setAddress,
    setDocument,
    setGeneratedCv,
    setPreferences,
    setProfile,
    setProfileImage,
    stepIndex,
    steps,
  }
}
