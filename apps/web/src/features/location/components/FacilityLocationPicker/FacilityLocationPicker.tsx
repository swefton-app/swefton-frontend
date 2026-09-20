import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import L, { type Map as LeafletMap, type Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GymInput } from '@swefton/shared/onboarding'
import { Check, Crosshair, LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { config } from '../../../../config'
import { geocodingApi, type GeocodingResult } from '../../api/geocodingApi'
import styles from './FacilityLocationPicker.module.css'

type LocationFields = Pick<
  GymInput,
  'addressLine' | 'city' | 'state' | 'postalCode' | 'country' | 'formattedAddress' | 'latitude' | 'longitude'
>

interface FacilityLocationPickerProps {
  value: LocationFields
  onChange: (location: LocationFields) => void
  error?: string
  tone?: 'light' | 'dark'
  disabled?: boolean
}

const DEFAULT_CENTER: [number, number] = [41.3275, 19.8187]

function administrativeAreaName(value?: string) {
  return value?.replace(/\s+(?:County|Municipality)$/i, '').trim()
}

function cityFromResult(address: GeocodingResult['address']) {
  return address.city ??
    address.town ??
    administrativeAreaName(address.county) ??
    administrativeAreaName(address.municipality) ??
    address.village ??
    address.hamlet ??
    ''
}

function addressFromResult(result: GeocodingResult): LocationFields {
  const address = result.address ?? {}
  const road = address.road ?? address.pedestrian
  const placeName = address.amenity ?? address.building ?? address.shop ??
    address.leisure ?? address.tourism ?? result.name
  const streetParts = [address.house_number, road].filter(Boolean)
  const addressLine = streetParts.join(' ') || placeName || result.display_name.split(',')[0]?.trim() || ''
  const formattedAddress = result.display_name
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(', ')

  return {
    addressLine: addressLine.slice(0, 255),
    city: cityFromResult(address).slice(0, 100),
    state: (address.state ?? address.county ?? address.state_district ?? '').slice(0, 100) || undefined,
    postalCode: address.postcode?.slice(0, 20),
    country: (address.country ?? '').slice(0, 100),
    formattedAddress: formattedAddress.slice(0, 500),
    latitude: Number(Number(result.lat).toFixed(7)),
    longitude: Number(Number(result.lon).toFixed(7)),
  }
}

export function FacilityLocationPicker({
  value,
  onChange,
  error,
  tone = 'light',
  disabled = false,
}: FacilityLocationPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [draft, setDraft] = useState<LocationFields | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const mapElementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const requestIdRef = useRef(0)

  const selected = value.latitude !== undefined && value.longitude !== undefined

  const showPicker = () => {
    setQuery(value.formattedAddress || [value.addressLine, value.city, value.country].filter(Boolean).join(', '))
    setResults([])
    setMessage('')
    setDraft(selected ? value : null)
    setOpen(true)
  }

  const setMapPosition = (latitude: number, longitude: number, zoom = 17) => {
    const map = mapRef.current
    if (!map) return
    map.setView([latitude, longitude], zoom)
    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true,
        autoPan: true,
        icon: L.divIcon({
          className: styles.marker,
          html: '<span></span>',
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        }),
      }).addTo(map)
      markerRef.current.on('dragend', () => {
        const point = markerRef.current?.getLatLng()
        if (point) void chooseCoordinates(point.lat, point.lng, false)
      })
    } else {
      markerRef.current.setLatLng([latitude, longitude])
    }
  }

  const chooseCoordinates = async (latitude: number, longitude: number, moveMap = true) => {
    const nextRequestId = ++requestIdRef.current
    setBusy(true)
    setDraft(null)
    setMessage('Finding the exact address…')
    setResults([])
    if (moveMap) setMapPosition(latitude, longitude)
    else markerRef.current?.setLatLng([latitude, longitude])

    try {
      const result = await geocodingApi.reverse(latitude, longitude)
      if (nextRequestId !== requestIdRef.current) return
      const location = addressFromResult(result)
      setDraft(location)
      setQuery(location.formattedAddress ?? '')
      setMessage('Location selected. You can drag the pin to fine-tune it.')
    } catch {
      if (nextRequestId !== requestIdRef.current) return
      setMessage('We could not find an address for that point. Try a nearby building or search again.')
    } finally {
      if (nextRequestId === requestIdRef.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (!open || !mapElementRef.current || mapRef.current) return
    const hasCoordinates = draft?.latitude !== undefined && draft.longitude !== undefined
    const center: [number, number] = hasCoordinates
      ? [draft.latitude as number, draft.longitude as number]
      : DEFAULT_CENTER
    const map = L.map(mapElementRef.current, { zoomControl: true }).setView(center, hasCoordinates ? 17 : 7)
    L.tileLayer(config.mapTileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    map.on('click', (event) => void chooseCoordinates(event.latlng.lat, event.latlng.lng))
    mapRef.current = map
    if (hasCoordinates) setMapPosition(center[0], center[1])
    window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // The map lifecycle is intentionally tied only to the dialog state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    const nextRequestId = ++requestIdRef.current
    setBusy(true)
    setMessage('Searching for places…')
    try {
      const matches = await geocodingApi.search(trimmedQuery)
      if (nextRequestId !== requestIdRef.current) return
      setResults(matches)
      setMessage(matches.length ? 'Choose a result or click the map.' : 'No places found. Try a more specific address.')
    } catch {
      if (nextRequestId !== requestIdRef.current) return
      setResults([])
      setMessage('Place search is temporarily unavailable. You can still click the map.')
    } finally {
      if (nextRequestId === requestIdRef.current) setBusy(false)
    }
  }

  const chooseResult = (result: GeocodingResult) => {
    const location = addressFromResult(result)
    setDraft(location)
    setQuery(location.formattedAddress ?? '')
    setResults([])
    setMessage('Location selected. You can drag the pin to fine-tune it.')
    if (location.latitude !== undefined && location.longitude !== undefined) {
      setMapPosition(location.latitude, location.longitude)
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Your browser does not support location access.')
      return
    }
    setBusy(true)
    setMessage('Getting your current location…')
    navigator.geolocation.getCurrentPosition(
      (position) => void chooseCoordinates(position.coords.latitude, position.coords.longitude),
      () => {
        setBusy(false)
        setMessage('Location access was unavailable. Search for the facility or click the map instead.')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  const confirm = () => {
    if (!draft?.formattedAddress || draft.latitude === undefined || draft.longitude === undefined) return
    onChange(draft)
    setOpen(false)
  }

  return (
    <div className={`${styles.picker} ${styles[tone]}`}>
      <button type="button" className={styles.openButton} onClick={showPicker} aria-invalid={Boolean(error)} disabled={disabled}>
        <MapPin />
        <span>
          <strong>{selected ? 'Change map location' : 'Choose exact location on map'}</strong>
          <small>{selected ? value.formattedAddress || `${value.latitude}, ${value.longitude}` : 'Search, click the map, or drag the pin'}</small>
        </span>
        {selected && <Check className={styles.check} />}
      </button>
      {error && <small className={styles.fieldError}>{error}</small>}
      {selected && <div className={styles.coordinates}>Lat {value.latitude?.toFixed(7)} · Lng {value.longitude?.toFixed(7)}</div>}

      {open && createPortal(
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false)
        }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="location-picker-title">
            <header className={styles.dialogHeader}>
              <div>
                <span>Facility location</span>
                <h2 id="location-picker-title">Choose the exact place</h2>
                <p>Search for an address, then click the building or drag the pin.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close map"><X /></button>
            </header>

            <form className={styles.searchForm} onSubmit={(event) => void search(event)}>
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a business, street, or address" autoFocus />
              <button type="submit" disabled={busy || !query.trim()}>{busy ? <LoaderCircle className={styles.spin} /> : 'Search'}</button>
            </form>

            {results.length > 0 && (
              <div className={styles.results}>
                {results.map((result) => (
                  <button type="button" key={result.place_id} onClick={() => chooseResult(result)}>
                    <MapPin /><span>{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.mapWrap}>
              <div ref={mapElementRef} className={styles.map} aria-label="Interactive facility location map" />
              <button type="button" className={styles.locateButton} onClick={useCurrentLocation} disabled={busy}>
                <Crosshair /> Use my location
              </button>
            </div>

            <div className={styles.selection}>
              <div>
                <span>{busy && <LoaderCircle className={styles.spin} />}{message || 'Click the map to select the facility entrance.'}</span>
                {draft?.formattedAddress && <strong>{draft.formattedAddress}</strong>}
              </div>
              {draft?.latitude !== undefined && draft.longitude !== undefined && (
                <small>{draft.latitude.toFixed(7)}, {draft.longitude.toFixed(7)}</small>
              )}
            </div>

            <footer className={styles.dialogActions}>
              <button type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" onClick={confirm} disabled={busy || !draft?.formattedAddress}>
                <Check /> Use this location
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
