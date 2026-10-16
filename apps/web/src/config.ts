export const config = {
  apiUrl: import.meta.env.VITE_API_URL?.trim() || '/api/v1',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim(),
  geocodingUrl: import.meta.env.VITE_GEOCODING_URL?.trim() || 'https://nominatim.openstreetmap.org',
  mapTileUrl: import.meta.env.VITE_MAP_TILE_URL?.trim() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
}
