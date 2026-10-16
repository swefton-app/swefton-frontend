import { FACILITY_CATEGORIES, type FacilityCategory } from '@swefton/shared/onboarding'

const ACTIVE_BUSINESS_KEY = 'swefton.activeBusiness'

export interface ActiveBusiness {
  id: number
  category: FacilityCategory
}

export const activeBusinessStorage = {
  get(): ActiveBusiness | null {
    const stored = localStorage.getItem(ACTIVE_BUSINESS_KEY)
      ?? sessionStorage.getItem(ACTIVE_BUSINESS_KEY)
    if (!stored) return null

    try {
      const value = JSON.parse(stored) as Partial<ActiveBusiness>
      return typeof value.id === 'number'
        && typeof value.category === 'string'
        && FACILITY_CATEGORIES.includes(value.category as FacilityCategory)
        ? { id: value.id, category: value.category as FacilityCategory }
        : null
    } catch {
      return null
    }
  },

  save(business: ActiveBusiness, persistent: boolean) {
    const target = persistent ? localStorage : sessionStorage
    localStorage.removeItem(ACTIVE_BUSINESS_KEY)
    sessionStorage.removeItem(ACTIVE_BUSINESS_KEY)
    target.setItem(ACTIVE_BUSINESS_KEY, JSON.stringify(business))
  },

  clear() {
    localStorage.removeItem(ACTIVE_BUSINESS_KEY)
    sessionStorage.removeItem(ACTIVE_BUSINESS_KEY)
  },
}
