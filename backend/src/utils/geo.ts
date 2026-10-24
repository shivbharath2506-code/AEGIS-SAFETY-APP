/**
 * Geodetic calculations for geospatial distance and bounding boxes.
 * Uses Earth mean radius 6371000 meters.
 */

export const EARTH_RADIUS_METERS = 6371000;

export const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

export const toDegrees = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
};

/**
 * Calculates a bounding box in degrees given a center point and radius in meters.
 */
export const getBoundingBox = (
  lat: number,
  lon: number,
  radiusMeters: number
) => {
  const dLat = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const dLon =
    (radiusMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(lat)))) *
    (180 / Math.PI);

  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon
  };
};
