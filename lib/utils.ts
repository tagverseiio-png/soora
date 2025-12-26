import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ReverseGeocodeResult {
  street: string;
  postalCode?: string;
  district?: string;
  building?: string;
  city?: string;
  country?: string;
  raw?: any;
}

// Uses OpenStreetMap Nominatim to reverse-geocode lat/lon to an address.
// Note: From the browser, custom headers like User-Agent cannot be set; this still usually works.
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
  const res = await fetch(url, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Reverse geocode failed: ${res.status}`);
  }
  const data = await res.json();
  const addr = data?.address || {};
  const streetParts = [addr.road, addr.house_number].filter(Boolean);
  const street = streetParts.join(' ').trim();
  const district = addr.suburb || addr.neighbourhood || addr.city_district || addr.county || addr.state_district || addr.state;
  return {
    street,
    postalCode: addr.postcode,
    district,
    building: addr.building || addr.public_building || undefined,
    city: addr.city || addr.town || addr.village || undefined,
    country: addr.country || undefined,
    raw: data,
  };
}
