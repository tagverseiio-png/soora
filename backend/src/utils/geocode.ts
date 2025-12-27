import axios from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocode a Singapore address using OpenStreetMap Nominatim.
 * Returns lat/lng and a normalized display name, or null if not found.
 */
export async function geocodeSingaporeAddress(street: string, postalCode?: string): Promise<GeocodeResult | null> {
  try {
    const q = postalCode ? `${street}, Singapore ${postalCode}` : `${street}, Singapore`;
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = {
      q,
      format: 'json',
      addressdetails: '1',
      countrycodes: 'sg',
      limit: '1',
    };
    const res = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'soora-app/1.0 (sandbox-testing)'
      }
    });
    const first = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    const displayName: string = first.display_name || q;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, displayName };
    }
    return null;
  } catch (e) {
    return null;
  }
}
