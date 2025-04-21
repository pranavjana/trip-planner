/**
 * Format a distance in meters to a human-readable format
 */
export const formatDistance = (meters: number): string => {
  if (!meters && meters !== 0) return 'N/A';
  
  // Convert to kilometers if more than 1000 meters
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }
  
  return `${Math.round(meters)} m`;
};

/**
 * Format a time in seconds to a human-readable format
 */
export const formatTime = (seconds: number): string => {
  if (!seconds && seconds !== 0) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} min`;
  }
}; 