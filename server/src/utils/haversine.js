/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks whether coordinate is within office geofence.
 * If office lat/lng is not configured, returns { within: true, distanceMeters: null }
 */
export function checkGeofence(lat, lng) {
  // If explicitly disabled in env (convenient for local evaluator dev/testing)
  if (process.env.ENABLE_GEOFENCE === "false") {
    return { within: true, distanceMeters: null, enabled: false };
  }

  const officeLat = process.env.OFFICE_LAT ? parseFloat(process.env.OFFICE_LAT) : null;
  const officeLng = process.env.OFFICE_LNG ? parseFloat(process.env.OFFICE_LNG) : null;
  const officeRadius = process.env.OFFICE_RADIUS_M ? parseFloat(process.env.OFFICE_RADIUS_M) : 200;

  if (officeLat === null || officeLng === null || isNaN(officeLat) || isNaN(officeLng)) {
    return { within: true, distanceMeters: null, enabled: false };
  }

  const distance = calculateDistanceMeters(lat, lng, officeLat, officeLng);
  return {
    within: distance <= officeRadius,
    distanceMeters: Math.round(distance),
    radiusMeters: officeRadius,
    enabled: true,
  };
}
