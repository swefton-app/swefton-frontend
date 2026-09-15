import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  authEndpoints,
  publicAuthEndpoints,
  type TokenResponse,
} from '@swefton/shared/auth'
import { config } from '../../config'
import { tokenStorage } from '../storage/tokenStorage'

const API_BASE_URL = config.apiUrl

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function isJsonRequestBody(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false

  return !(
    data instanceof FormData ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof URLSearchParams
  )
}

class HttpClient {
  private static instance: AxiosInstance
  private static refreshRequest: Promise<TokenResponse> | null = null

  static getInstance(): AxiosInstance {
    if (!HttpClient.instance) {
      HttpClient.instance = axios.create({
        baseURL: API_BASE_URL,
        timeout: 15_000,
      })

      HttpClient.configureInterceptors(HttpClient.instance)
    }

    return HttpClient.instance
  }

  private static configureInterceptors(client: AxiosInstance) {
    client.interceptors.request.use((requestConfig) => {
      const accessToken = tokenStorage.getAccessToken()

      if (requestConfig.data instanceof FormData) {
        requestConfig.headers.delete('Content-Type')
      } else if (
        isJsonRequestBody(requestConfig.data) &&
        !requestConfig.headers.has('Content-Type')
      ) {
        requestConfig.headers.set('Content-Type', 'application/json')
      }

      if (accessToken && !requestConfig.headers.has('Authorization')) {
        requestConfig.headers.Authorization = `Bearer ${accessToken}`
      }

      return requestConfig
    })

    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const request = error.config as RetryableRequest | undefined
        const isPublicAuthRequest = publicAuthEndpoints.some((path) =>
          request?.url?.endsWith(path),
        )
        const refreshToken = tokenStorage.getRefreshToken()

        if (
          error.response?.status !== 401 ||
          !request ||
          request._retry ||
          isPublicAuthRequest ||
          !refreshToken
        ) {
          return Promise.reject(error)
        }

        request._retry = true

        try {
          HttpClient.refreshRequest ??= axios
            .post<TokenResponse>(`${API_BASE_URL}${authEndpoints.refresh}`, {
              refreshToken,
            })
            .then(({ data }) => data)
            .finally(() => {
              HttpClient.refreshRequest = null
            })

          const tokens = await HttpClient.refreshRequest
          tokenStorage.save(tokens)
          request.headers.Authorization = `Bearer ${tokens.accessToken}`

          return client(request)
        } catch (refreshError) {
          tokenStorage.clear()
          return Promise.reject(refreshError)
        }
      },
    )
  }
}

export const httpClient = HttpClient.getInstance()
