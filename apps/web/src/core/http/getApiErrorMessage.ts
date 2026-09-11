import axios from 'axios'

interface ErrorResponse {
  message?: string
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.message || error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}
