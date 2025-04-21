import { distance } from '@turf/distance';
import { point } from '@turf/helpers';
import { Location, DistanceInfo } from '../types';

// Bali's coordinates (approximately)
export const BALI_CENTER: [number, number] = [115.1889, -8.4095];
export const DEFAULT_ZOOM = 10;

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Calculate direct distance between two locations using turf.js
export const calculateDirectDistance = (
  from: Location,
  to: Location
): number => {
  const fromPoint = point(from.coordinates);
  const toPoint = point(to.coordinates);
  
  // Calculate distance in kilometers
  return distance(fromPoint, toPoint, { units: 'kilometers' });
};

// Calculate all direct distances between locations
export const calculateAllDirectDistances = (
  locations: Location[]
): DistanceInfo[] => {
  const distances: DistanceInfo[] = [];
  
  if (locations.length < 2) return distances;
  
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const from = locations[i];
      const to = locations[j];
      const directDistance = calculateDirectDistance(from, to);
      
      distances.push({
        from,
        to,
        directDistance
      });
    }
  }
  
  return distances;
}; 