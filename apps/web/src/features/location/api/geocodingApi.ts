import { config } from '../../../config'

export interface GeocodingAddress {
  amenity?: string
  building?: string
  city?: string
  country?: string
  county?: string
  hamlet?: string
  house_number?: string
  leisure?: string
  municipality?: string
  pedestrian?: string
  postcode?: string
  road?: string
  shop?: string
  state?: string
  state_district?: string
  suburb?: string
  tourism?: string
  town?: string
  village?: string
}

export interface GeocodingResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  name?: string
  address: GeocodingAddress
}

let requestQueue = Promise.resolve()
let lastRequestAt = 0

function rateLimitedRequest<T>(url: URL): Promise<T> {
  const execute = async () => {
    const waitFor = Math.max(0, 1_050 - (Date.now() - lastRequestAt))
    if (waitFor) await new Promise((resolve) => window.setTimeout(resolve, waitFor))

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    lastRequestAt = Date.now()
    if (!response.ok) throw new Error('The address service is unavailable.')
    return response.json() as Promise<T>
  }

  const request = requestQueue.then(execute, execute)
  requestQueue = request.then(() => undefined, () => undefined)
  return request
}

function endpoint(path: 'search' | 'reverse') {
  return new URL(path, `${config.geocodingUrl.replace(/\/$/, '')}/`)
}

export const geocodingApi = {
  search(query: string) {
    const url = endpoint('search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '5')
    url.searchParams.set('accept-language', navigator.language)
    return rateLimitedRequest<GeocodingResult[]>(url)
  },

  reverse(latitude: number, longitude: number) {
    const url = endpoint('reverse')
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')
    url.searchParams.set('accept-language', navigator.language)
    return rateLimitedRequest<GeocodingResult>(url)
  },
}
