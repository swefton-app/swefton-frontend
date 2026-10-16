import axios from 'axios'

const GENERIC_HTTP_ERROR = /^Request failed with status code \d+$/i

function readableString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const message = value.trim()
  return message && !GENERIC_HTTP_ERROR.test(message) ? message : undefined
}

function backendMessage(data: unknown): string | undefined {
  const text = readableString(data)
  if (text) return text
  if (!data || typeof data !== 'object') return undefined

  const response = data as Record<string, unknown>
  for (const field of ['message', 'detail', 'error', 'title']) {
    const message = readableString(response[field])
    if (message) return message
  }

  if (Array.isArray(response.errors)) {
    const messages = response.errors
      .map((item) => {
        if (typeof item === 'string') return readableString(item)
        if (!item || typeof item !== 'object') return undefined
        const validationError = item as Record<string, unknown>
        const message = readableString(validationError.defaultMessage)
          ?? readableString(validationError.message)
        const field = readableString(validationError.field)
        return message && field ? `${field}: ${message}` : message
      })
      .filter((message): message is string => Boolean(message))
    if (messages.length) return messages.join('. ')
  }

  if (response.errors && typeof response.errors === 'object') {
    const messages = Object.entries(response.errors as Record<string, unknown>)
      .map(([field, value]) => {
        const message = readableString(value)
        return message ? `${field}: ${message}` : undefined
      })
      .filter((message): message is string => Boolean(message))
    if (messages.length) return messages.join('. ')
  }

  return undefined
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return backendMessage(error.response?.data)
      ?? readableString(error.response?.statusText)
      ?? readableString(fallback)
      ?? readableString(error.message)
      ?? 'Something went wrong. Please try again.'
  }

  return error instanceof Error
    ? readableString(error.message) ?? fallback
    : fallback
}
