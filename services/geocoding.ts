import { mapboxToken } from '@/constants/env';
import type { GeoPoint } from '@/types';

const MAPBOX_GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

interface MapboxFeature {
  place_name?: string;
  text?: string;
  context?: Array<{ id?: string; text?: string }>;
}

interface MapboxResponse {
  features?: MapboxFeature[];
}

export async function reverseGeocode(coords: GeoPoint): Promise<string | null> {
  if (!mapboxToken) {
    return null;
  }

  const url = `${MAPBOX_GEOCODE_BASE}/${coords.longitude},${coords.latitude}.json?access_token=${mapboxToken}&language=en&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Mapbox reverse geocode error', await response.text());
      return null;
    }

    const payload = (await response.json()) as MapboxResponse;
    const feature = payload.features?.[0];
    if (!feature) {
      return null;
    }

    if (feature.place_name) {
      return feature.place_name;
    }

    const contextText = feature.context?.map((item) => item.text).filter(Boolean).join(', ');
    return contextText ?? feature.text ?? null;
  } catch (error) {
    console.error('reverseGeocode failed', error);
    return null;
  }
}


