import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface PlaceSearchResult {
  id: string;
  name: string;
  displayName: string;
  address: string;
  locality?: string;
  latitude: number;
  longitude: number;
  category: string;
  type: string;
  provider: 'google' | 'osm' | 'photon';
}

export interface ReverseGeocodeResult {
  name: string;
  displayName: string;
  address: string;
  locality?: string;
  latitude: number;
  longitude: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class PlacesService {
  private searchCache = new Map<string, CacheEntry<PlaceSearchResult[]>>();
  private reverseCache = new Map<string, CacheEntry<ReverseGeocodeResult>>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Search for any real-world place (theatres, apartments, offices, temples, hospitals, etc.)
   */
  async searchPlaces(
    query: string,
    userLat?: number,
    userLng?: number
  ): Promise<PlaceSearchResult[]> {
    const q = query.trim();
    if (!q || q.length < 2) {
      return [];
    }

    const cacheKey = `search_${q.toLowerCase()}_${(userLat || 13.0827).toFixed(2)}_${(userLng || 80.2707).toFixed(2)}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 1. Try Google Places API if configured
    if (config.GOOGLE_MAPS_API_KEY && config.GOOGLE_MAPS_API_KEY.trim().length > 0) {
      try {
        const googleResults = await this.searchGooglePlaces(q, userLat, userLng);
        if (googleResults && googleResults.length > 0) {
          this.searchCache.set(cacheKey, { data: googleResults, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return googleResults;
        }
      } catch (err: any) {
        logger.warn('Google Places API search failed, falling back to OSM Nominatim:', { error: err.message });
      }
    }

    // 2. OpenStreetMap Nominatim with Chennai / Tamil Nadu biasing
    try {
      const osmResults = await this.searchOsmNominatim(q);
      if (osmResults && osmResults.length > 0) {
        this.searchCache.set(cacheKey, { data: osmResults, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return osmResults;
      }
    } catch (err: any) {
      logger.warn('OSM Nominatim search failed, attempting Photon fallback:', { error: err.message });
    }

    // 3. Photon OSM fallback
    try {
      const photonResults = await this.searchPhoton(q);
      if (photonResults && photonResults.length > 0) {
        this.searchCache.set(cacheKey, { data: photonResults, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return photonResults;
      }
    } catch (err: any) {
      logger.warn('Photon fallback search failed:', { error: err.message });
    }

    return [];
  }

  /**
   * Reverse geocode coordinates into a readable place name and address.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const cacheKey = `rev_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cached = this.reverseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 1. Google Geocoding if configured
    if (config.GOOGLE_MAPS_API_KEY && config.GOOGLE_MAPS_API_KEY.trim().length > 0) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${config.GOOGLE_MAPS_API_KEY}`;
        const res = await axios.get(url, { timeout: 4000 });
        if (res.data && res.data.results && res.data.results.length > 0) {
          const first = res.data.results[0];
          const result: ReverseGeocodeResult = {
            name: first.address_components?.[0]?.long_name || 'Current Location',
            displayName: first.formatted_address,
            address: first.formatted_address,
            latitude,
            longitude
          };
          this.reverseCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return result;
        }
      } catch (err: any) {
        logger.warn('Google reverse geocode failed, falling back to OSM:', { error: err.message });
      }
    }

    // 2. OSM Nominatim Reverse
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'AEGIS-Intelligent-Safe-Navigator/1.0 (contact@aegis-safety.org)' },
        timeout: 4500
      });

      if (res.data) {
        const d = res.data;
        const addr = d.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.city_district || addr.city;
        const placeName = d.name || road || 'Current Location';

        const result: ReverseGeocodeResult = {
          name: placeName,
          displayName: d.display_name || placeName,
          address: d.display_name || `${road || ''}, Chennai`,
          locality: addr.suburb || addr.city || addr.state,
          latitude,
          longitude
        };

        this.reverseCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return result;
      }
    } catch (err: any) {
      logger.warn('OSM reverse geocoding failed:', { error: err.message });
    }

    // Fallback if network fails
    return {
      name: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      displayName: `GPS Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
      address: `Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}`,
      latitude,
      longitude
    };
  }

  // --- Private Helpers ---

  private async searchGooglePlaces(
    query: string,
    userLat?: number,
    userLng?: number
  ): Promise<PlaceSearchResult[]> {
    const lat = userLat || config.DEFAULT_LATITUDE;
    const lng = userLng || config.DEFAULT_LONGITUDE;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=35000&key=${config.GOOGLE_MAPS_API_KEY}`;
    const res = await axios.get(url, { timeout: 4500 });

    if (res.data && res.data.results) {
      return res.data.results.slice(0, 7).map((p: any) => ({
        id: `google-${p.place_id}`,
        name: p.name,
        displayName: p.formatted_address,
        address: p.formatted_address,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        category: p.types?.[0] || 'place',
        type: this.categorizePlace(p.types?.[0] || '', p.name),
        provider: 'google' as const
      }));
    }
    return [];
  }

  private async searchOsmNominatim(query: string): Promise<PlaceSearchResult[]> {
    // First search bounded to Chennai Metropolitan Area viewbox
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&viewbox=79.9,13.35,80.35,12.8&limit=7&addressdetails=1`;
    let res = await axios.get(url, {
      headers: { 'User-Agent': 'AEGIS-Intelligent-Safe-Navigator/1.0 (contact@aegis-safety.org)' },
      timeout: 4500
    });

    let items = res.data || [];

    // If 0 results within Chennai viewbox, try unrestricted nationwide search
    if (items.length === 0) {
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=7&addressdetails=1`;
      res = await axios.get(url, {
        headers: { 'User-Agent': 'AEGIS-Intelligent-Safe-Navigator/1.0 (contact@aegis-safety.org)' },
        timeout: 4500
      });
      items = res.data || [];
    }

    return items.map((item: any) => {
      const addr = item.address || {};
      const shortName = item.name || item.display_name.split(',')[0].trim();
      const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || '';
      
      return {
        id: `osm-${item.osm_id || item.place_id}`,
        name: shortName,
        displayName: item.display_name,
        address: item.display_name,
        locality,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        category: item.type || item.class || 'place',
        type: this.categorizePlace(item.type || item.class || '', shortName),
        provider: 'osm' as const
      };
    });
  }

  private async searchPhoton(query: string): Promise<PlaceSearchResult[]> {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=13.0827&lon=80.2707&limit=7`;
    const res = await axios.get(url, { timeout: 4500 });

    if (res.data && res.data.features) {
      return res.data.features.map((f: any) => {
        const p = f.properties || {};
        const coords = f.geometry.coordinates; // [lon, lat]
        const name = p.name || p.street || 'Specific Place';
        const locality = [p.district, p.city, p.state].filter(Boolean).join(', ');
        const fullAddress = [name, p.street, p.district, p.city, p.postcode, p.state].filter(Boolean).join(', ');

        return {
          id: `photon-${p.osm_id || Math.random().toString(36).substr(2, 9)}`,
          name,
          displayName: fullAddress,
          address: fullAddress,
          locality,
          latitude: coords[1],
          longitude: coords[0],
          category: p.osm_value || p.osm_key || 'place',
          type: this.categorizePlace(p.osm_value || '', name),
          provider: 'photon' as const
        };
      });
    }
    return [];
  }

  private categorizePlace(rawType: string, name: string): string {
    const lower = (rawType + ' ' + name).toLowerCase();
    if (lower.includes('cinema') || lower.includes('theatre') || lower.includes('screen') || lower.includes('movie')) {
      return 'Cinema / Theatre';
    }
    if (lower.includes('apartment') || lower.includes('residency') || lower.includes('tower') || lower.includes('villa') || lower.includes('fortune') || lower.includes('enclave')) {
      return 'Residential / Apartment';
    }
    if (lower.includes('temple') || lower.includes('church') || lower.includes('mosque') || lower.includes('kovil') || lower.includes('worship')) {
      return 'Place of Worship';
    }
    if (lower.includes('hospital') || lower.includes('clinic') || lower.includes('medical') || lower.includes('pharmacy')) {
      return 'Hospital / Health';
    }
    if (lower.includes('college') || lower.includes('university') || lower.includes('school') || lower.includes('campus')) {
      return 'Education / College';
    }
    if (lower.includes('mall') || lower.includes('restaurant') || lower.includes('hotel') || lower.includes('bazaar') || lower.includes('market')) {
      return 'Shopping / Dining';
    }
    if (lower.includes('metro') || lower.includes('bus') || lower.includes('station') || lower.includes('railway') || lower.includes('transit') || lower.includes('airport')) {
      return 'Transit / Station';
    }
    if (lower.includes('office') || lower.includes('tech') || lower.includes('park') || lower.includes('cyber') || lower.includes('tidel')) {
      return 'Office / Workplace';
    }
    return 'Location / Address';
  }
}

export const placesService = new PlacesService();
