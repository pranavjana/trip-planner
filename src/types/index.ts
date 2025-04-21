export interface Category {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  categoryId?: string;
}

export interface RouteGeometry {
  type: string;
  coordinates: [number, number][];
}

export interface DistanceInfo {
  from: Location;
  to: Location;
  directDistance: number; // in kilometers
  drivingDistance?: number; // in kilometers (optional)
  drivingDuration?: number; // in seconds (optional)
  routeGeometry?: RouteGeometry; // GeoJSON LineString geometry
} 