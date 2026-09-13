import {
  dashboardEndpoints,
  type TrainerSummary,
} from '@swefton/shared/dashboard'
import { httpClient } from '../../../core/http/httpClient'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function getItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of ['content', 'items', 'trainers', 'data']) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  return []
}

function getSpecialties(item: JsonRecord): string[] {
  const source = item.specialties ?? item.categories ?? item.expertise
  if (!Array.isArray(source)) return []

  return source.flatMap((value) => {
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    if (!isRecord(value)) return []
    const label = asText(value.name) ?? asText(value.label)
    return label ? [label] : []
  })
}

function normalizeTrainer(value: unknown, index: number): TrainerSummary | null {
  if (!isRecord(value)) return null

  const profile = isRecord(value.profile) ? value.profile : value
  const address = isRecord(value.address) ? value.address : value
  const firstName = asText(profile.firstName)
  const lastName = asText(profile.lastName)
  const displayName =
    asText(profile.displayName) ??
    [firstName, lastName].filter(Boolean).join(' ') ??
    asText(value.name)

  if (!displayName) return null

  const rawId = value.id ?? value.userId ?? profile.id

  return {
    id: rawId === undefined ? `trainer-${index}` : String(rawId),
    displayName,
    bio: asText(profile.bio),
    experience: asNumber(profile.experience),
    price: asNumber(profile.price),
    city: asText(address.city),
    country: asText(address.country),
    avatarUrl:
      asText(profile.avatarUrl) ??
      asText(value.avatarUrl) ??
      asText(value.imageUrl),
    specialties: getSpecialties(value),
  }
}

export const trainerApi = {
  async list(): Promise<TrainerSummary[]> {
    const { data } = await httpClient.get<unknown>(
      dashboardEndpoints.publicTrainers,
    )

    return getItems(data).flatMap((item, index) => {
      const trainer = normalizeTrainer(item, index)
      return trainer ? [trainer] : []
    })
  },
}
