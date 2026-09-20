import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getOnboardingSteps,
  hasFieldErrors,
  validateAddress,
  validateGym,
  validatePreferences,
  validateProfile,
  type CreateFacilityRequest,
  type FacilityCategory,
  type FieldErrors,
  type GymInput,
  type OnboardingPrefill,
  type OnboardingRequest,
  type OnboardingRole,
  type TrainerDocumentResponse,
  type UserAddressInput,
  type UserPreferencesInput,
  type UserProfileInput,
} from '@swefton/shared/onboarding'
import type { FacilityStaffRole, StaffOnboardingContext } from '@swefton/shared/staff'
import { getApiErrorMessage } from '../../../core/http/getApiErrorMessage'
import { onboardingPrefillStorage } from '../../../core/storage/onboardingPrefillStorage'
import { onboardingApi, imageUrlToFile } from '../api/onboardingApi'
import { staffApi } from '../../staff/api/staffApi'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

interface UploadedAssets {
  avatar: boolean
  cv: boolean
  licence: boolean
  logoImageId?: number
  coverImageId?: number
  galleryImageIds?: number[]
  gymCreated: boolean
}

function getProfessionalDocumentsError(cvReady: boolean, licenceReady: boolean, requireLicence = true) {
  if (!cvReady && requireLicence && !licenceReady) {
    return 'Upload or create your CV, then add your professional licence to continue.'
  }
  if (!cvReady) return 'Upload or create your CV to continue.'
  if (requireLicence && !licenceReady) return 'Add your professional licence to continue.'
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

function initialGym(): GymInput {
  return {
    name: '',
    description: '',
    publicEmail: '',
    phoneNumber: '',
    websiteUrl: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    formattedAddress: '',
    type: '',
    open24Hours: false,
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
      latitude: address.latitude,
      longitude: address.longitude,
    },
    preferences,
  }
}

export function useOnboardingFlow(role: OnboardingRole) {
  const prefill = useMemo(() => onboardingPrefillStorage.get(), [])
  const steps = useMemo(() => getOnboardingSteps(role), [role])
  const [stepIndex, setStepIndex] = useState(0)
  const [profile, setProfile] = useState<UserProfileInput>(() => initialProfile(prefill))
  const [address, setAddress] = useState<UserAddressInput>({
    addressLine: '', city: '', state: '', postalCode: '', country: '',
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
  const [staffRole, setStaffRole] = useState<FacilityStaffRole>()
  const [staffContext, setStaffContext] = useState<StaffOnboardingContext>()
  const [facilityCategory, setFacilityCategory] = useState<FacilityCategory | ''>('')
  const [gym, setGym] = useState<GymInput>(initialGym)
  const [gymLogo, setGymLogoState] = useState<File | null>(null)
  const [gymCover, setGymCoverState] = useState<File | null>(null)
  const [gymGallery, setGymGalleryState] = useState<File[]>([])
  const [profileErrors, setProfileErrors] = useState<FieldErrors<UserProfileInput>>({})
  const [addressErrors, setAddressErrors] = useState<FieldErrors<UserAddressInput>>({})
  const [preferencesErrors, setPreferencesErrors] = useState<FieldErrors<UserPreferencesInput>>({})
  const [gymErrors, setGymErrors] = useState<FieldErrors<GymInput>>({})
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [pending, setPending] = useState(false)
  const uploaded = useRef<UploadedAssets>({ avatar: false, cv: false, licence: false, gymCreated: false })

  useEffect(() => {
    if (role !== 'STAFF') return
    let active = true
    void staffApi.onboardingContext()
      .then((context) => {
        if (active) setStaffContext(context)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'We could not open your staff onboarding invitation.'))
      })
    return () => { active = false }
  }, [role])

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
      setError('Documents must be 20 MB or smaller.')
      return
    }
    setError('')
    if (type === 'cv') {
      setCvState(file)
      setGeneratedCvState(null)
    } else {
      setLicenceState(file)
    }
    uploaded.current[type] = false
  }

  const setGymImage = (kind: 'logo' | 'cover', file: File | null) => {
    if (file && file.size > MAX_IMAGE_SIZE) {
      setError('Gym images must be 10 MB or smaller.')
      return
    }
    setError('')
    if (kind === 'logo') {
      setGymLogoState(file)
      uploaded.current.logoImageId = undefined
    } else {
      setGymCoverState(file)
      uploaded.current.coverImageId = undefined
    }
  }

  const setGymGallery = (files: File[]) => {
    if (files.length > 20) {
      setError('A gym gallery can contain up to 20 images.')
      return
    }
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError('Every gallery image must be 10 MB or smaller.')
      return
    }
    setError('')
    setGymGalleryState(files)
    uploaded.current.galleryImageIds = undefined
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

  const selectFacilityCategory = (category: FacilityCategory) => {
    setFacilityCategory(category)
    setGym((current) => ({
      ...current,
      type: category === 'GYM' ? (current.type === 'OTHER' ? '' : current.type) : 'OTHER',
    }))
    setError('')
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
    if (step.id === 'trainer-documents') {
      const documentsError = getProfessionalDocumentsError(Boolean(cv || generatedCv), Boolean(licence))
      if (documentsError) {
        setError(documentsError)
        return false
      }
    }
    if (step.id === 'staff-role' && !staffRole) {
      setError('Choose your staff role to continue.')
      return false
    }
    if (step.id === 'staff-documents') {
      const requireLicence = staffRole === 'INSTRUCTOR' || staffRole === 'TRAINER'
      const documentsError = getProfessionalDocumentsError(
        Boolean(cv || generatedCv),
        Boolean(licence),
        requireLicence,
      )
      if (documentsError) {
        setError(documentsError)
        return false
      }
    }
    if (step.id === 'facility-category' && !facilityCategory) {
      setError('Select a facility category to continue.')
      return false
    }
    if (step.id === 'gym-details') {
      const errors = validateGym(gym)
      setGymErrors(errors)
      return !hasFieldErrors(errors)
    }
    return true
  }

  const submitBusinessAssets = async () => {
    if (licence && !uploaded.current.licence) {
      setProgress('Uploading your business licence…')
      await onboardingApi.uploadFacilityDocument(licence, 'LICENCE')
      uploaded.current.licence = true
    }
    if (gymLogo && uploaded.current.logoImageId === undefined) {
      setProgress('Uploading your gym logo…')
      uploaded.current.logoImageId = (await onboardingApi.uploadImage(gymLogo, 'LOGO', 0)).id
    }
    if (gymCover && uploaded.current.coverImageId === undefined) {
      setProgress('Uploading your gym cover…')
      uploaded.current.coverImageId = (await onboardingApi.uploadImage(gymCover, 'COVER', 0)).id
    }
    if (gymGallery.length && uploaded.current.galleryImageIds === undefined) {
      setProgress('Uploading your gym gallery…')
      const images = await Promise.all(
        gymGallery.map((file, position) => onboardingApi.uploadImage(file, 'GALLERY', position)),
      )
      uploaded.current.galleryImageIds = images.map((image) => image.id)
    }
  }

  const businessFacilityRequest = (): CreateFacilityRequest => {
    if (!gym.type || !facilityCategory) {
      throw new Error('Complete the facility registration details before continuing.')
    }

    const optionalText = (value?: string) => value?.trim() || undefined
    return {
      ...gym,
      category: facilityCategory,
      name: gym.name.trim(),
      description: optionalText(gym.description),
      publicEmail: optionalText(gym.publicEmail),
      phoneNumber: optionalText(gym.phoneNumber),
      websiteUrl: optionalText(gym.websiteUrl),
      addressLine: gym.addressLine.trim(),
      city: gym.city.trim(),
      state: optionalText(gym.state),
      postalCode: optionalText(gym.postalCode),
      country: gym.country.trim(),
      formattedAddress: optionalText(gym.formattedAddress),
      type: gym.type,
      logoImageId: uploaded.current.logoImageId,
      coverImageId: uploaded.current.coverImageId,
      galleryImageIds: uploaded.current.galleryImageIds ?? [],
    }
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
        const documentsError = getProfessionalDocumentsError(Boolean(cv || generatedCv), Boolean(licence))
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

      if (role === 'STAFF') {
        if (!staffRole) throw new Error('Choose your staff role to continue.')
        const requireLicence = staffRole === 'INSTRUCTOR' || staffRole === 'TRAINER'
        const documentsError = getProfessionalDocumentsError(
          Boolean(cv || generatedCv),
          Boolean(licence),
          requireLicence,
        )
        if (documentsError) throw new Error(documentsError)

        if (!uploaded.current.cv && cv) {
          setProgress('Uploading your CV…')
          await staffApi.uploadDocument(cv, 'CV')
          uploaded.current.cv = true
        }
        if (requireLicence && licence && !uploaded.current.licence) {
          setProgress('Uploading your professional licence…')
          await staffApi.uploadDocument(licence, 'LICENCE')
          uploaded.current.licence = true
        }
      }

      if (role === 'FACILITY_OWNER') {
        await submitBusinessAssets()
        const onboardingAddress: UserAddressInput = {
          addressLine: gym.addressLine,
          city: gym.city,
          state: gym.state,
          postalCode: gym.postalCode,
          country: gym.country,
          latitude: gym.latitude,
          longitude: gym.longitude,
        }
        setProgress('Saving your business and completing onboarding…')
        await onboardingApi.completeGymOnboarding({
          onboarding: cleanPayload(profile, onboardingAddress, preferences),
          facility: businessFacilityRequest(),
        })
        uploaded.current.gymCreated = true
      } else if (role === 'STAFF') {
        if (!staffRole) throw new Error('Choose your staff role to continue.')
        setProgress('Completing your staff profile…')
        await staffApi.completeOnboarding({
          role: staffRole,
          onboarding: cleanPayload({ ...profile, price: undefined }, address, preferences),
        })
      } else {
        setProgress('Finishing your Swefton profile…')
        await onboardingApi.complete(cleanPayload(profile, address, preferences))
      }
      onboardingPrefillStorage.clear()
      window.location.assign(role === 'FACILITY_OWNER' ? '/gymDashboard' : '/userDashboard')
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        requestError instanceof Error
          ? requestError.message
          : 'We could not finish your profile. Please try again.',
      ))
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
    facilityCategory,
    generatedCv,
    googlePictureUrl,
    gym,
    gymCover,
    gymErrors,
    gymGallery,
    gymLogo,
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
    setFacilityCategory: selectFacilityCategory,
    setGeneratedCv,
    setGym,
    setGymCover: (file: File | null) => setGymImage('cover', file),
    setGymGallery,
    setGymLogo: (file: File | null) => setGymImage('logo', file),
    setPreferences,
    setProfile,
    setProfileImage,
    setStaffRole,
    staffContext,
    staffRole,
    stepIndex,
    steps,
  }
}
