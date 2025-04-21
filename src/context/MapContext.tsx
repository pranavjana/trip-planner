'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Location, DistanceInfo, RouteGeometry, Category } from '../types';
import { calculateAllDirectDistances, generateId, calculateDirectDistance } from '../utils/mapUtils';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';
import { locationService, categoryService } from '../lib/supabase';

interface MapContextProps {
  locations: Location[];
  distances: DistanceInfo[];
  addLocation: (name: string, coordinates: [number, number], categoryId?: string) => void;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  clearLocations: () => void;
  fetchDrivingRoutes: (fromId?: string, toId?: string) => Promise<void>;
  categories: Category[];
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, name: string) => void;
  clearCategories: () => void;
  isLoading: boolean;
}

const MapContext = createContext<MapContextProps | undefined>(undefined);

// Simple "anonymous" user ID for Supabase when not using real auth
// In a real app, this would come from authentication
const ANONYMOUS_USER_ID = 'bali-trip-planner-user';

export function MapProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [distances, setDistances] = useState<DistanceInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load locations from Supabase on component mount
  useEffect(() => {
    async function loadLocations() {
      setIsLoading(true);
      try {
        const data = await locationService.getLocations(ANONYMOUS_USER_ID);
        setLocations(data);
      } catch (error) {
        console.error('Failed to load locations from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const savedLocations = localStorage.getItem('baliTripLocations');
        if (savedLocations) {
          try {
            const parsedLocations = JSON.parse(savedLocations);
            setLocations(parsedLocations);
          } catch (error) {
            console.error('Failed to parse saved locations:', error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadLocations();
  }, []);

  // Load categories from Supabase
  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      try {
        const data = await categoryService.getCategories(ANONYMOUS_USER_ID);
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const savedCats = localStorage.getItem('baliTripCategories');
        if (savedCats) {
          try {
            const parsedCats = JSON.parse(savedCats);
            setCategories(parsedCats);
          } catch (error) {
            console.error('Failed to parse saved categories:', error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadCategories();
  }, []);

  // Fetch driving routes for all location pairs or specific pair
  const fetchDrivingRoutes = useCallback(async (fromId?: string, toId?: string) => {
    // Check if we have enough locations
    if (locations.length < 2) return;
    
    let distanceInfos: DistanceInfo[];
    
    // If fromId and toId are provided, calculate only that specific route
    if (fromId && toId) {
      const fromLocation = locations.find(l => l.id === fromId);
      const toLocation = locations.find(l => l.id === toId);
      
      if (!fromLocation || !toLocation) {
        console.error('Invalid location IDs for route calculation');
        return;
      }
      
      // Calculate just the single route
      const directDistance = calculateDirectDistance(fromLocation, toLocation);
      
      distanceInfos = [{
        from: fromLocation,
        to: toLocation,
        directDistance
      }];
    } else {
      // Calculate all routes between all locations
      distanceInfos = calculateAllDirectDistances(locations);
    }
    
    // For each pair, get driving distance and route from Mapbox Directions API
    const routePromises = distanceInfos.map(async (distInfo) => {
      try {
        const [fromLng, fromLat] = distInfo.from.coordinates;
        const [toLng, toLat] = distInfo.to.coordinates;
        
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?` +
          `access_token=${MAPBOX_ACCESS_TOKEN}` +
          `&geometries=geojson` +
          `&overview=full` // Get full route geometry
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch driving directions: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // Convert distance from meters to kilometers
          const drivingDistance = route.distance / 1000;
          const drivingDuration = route.duration;
          const routeGeometry = route.geometry;
          
          return {
            ...distInfo,
            drivingDistance,
            drivingDuration,
            routeGeometry
          };
        }
      } catch (error) {
        console.error('Error fetching driving route:', error);
      }
      
      return distInfo;
    });
    
    try {
      const updatedDistances = await Promise.all(routePromises);
      setDistances(updatedDistances);
    } catch (error) {
      console.error('Error processing routes:', error);
    }
  }, [locations]);

  // Keep localStorage as backup
  useEffect(() => {
    localStorage.setItem('baliTripLocations', JSON.stringify(locations));
    
    // Calculate direct distances when locations change
    if (locations.length >= 2) {
      const directDistances = calculateAllDirectDistances(locations);
      setDistances(directDistances);
    } else {
      setDistances([]);
    }
  }, [locations]);

  // Persist categories to localStorage as backup
  useEffect(() => {
    localStorage.setItem('baliTripCategories', JSON.stringify(categories));
  }, [categories]);

  // Updated functions to use Supabase
  const addLocation = async (name: string, coordinates: [number, number], categoryId?: string) => {
    setIsLoading(true);
    
    const newLocationData = {
      name,
      coordinates,
      user_id: ANONYMOUS_USER_ID,
      ...(categoryId ? { categoryId } : {})
    };
    
    try {
      // Try to save to Supabase first
      const savedLocation = await locationService.addLocation(newLocationData);
      
      if (savedLocation) {
        setLocations([...locations, savedLocation]);
      } else {
        // If Supabase fails, fallback to client-side ID generation
        const newLocation: Location = {
          id: generateId(),
          name,
          coordinates,
          ...(categoryId ? { categoryId } : {})
        };
        setLocations([...locations, newLocation]);
      }
    } catch (error) {
      console.error('Error adding location to Supabase:', error);
      // Fallback to client-side ID
      const newLocation: Location = {
        id: generateId(),
        name,
        coordinates,
        ...(categoryId ? { categoryId } : {})
      };
      setLocations([...locations, newLocation]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeLocation = async (id: string) => {
    setIsLoading(true);
    
    try {
      // Try to delete from Supabase first
      await locationService.deleteLocation(id);
    } catch (error) {
      console.error('Error deleting location from Supabase:', error);
    } finally {
      // Always update the local state regardless of Supabase result
      setLocations(locations.filter(location => location.id !== id));
      setIsLoading(false);
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    setIsLoading(true);
    
    try {
      // Try to update in Supabase first
      await locationService.updateLocation(id, updates);
    } catch (error) {
      console.error('Error updating location in Supabase:', error);
    } finally {
      // Always update the local state regardless of Supabase result
      setLocations(
        locations.map(location => 
          location.id === id ? { ...location, ...updates } : location
        )
      );
      setIsLoading(false);
    }
  };

  const clearLocations = async () => {
    setIsLoading(true);
    
    try {
      // In a full implementation, we would have a batch delete endpoint
      // For now, we'll delete each location individually
      await Promise.all(locations.map(loc => locationService.deleteLocation(loc.id)));
    } catch (error) {
      console.error('Error clearing locations from Supabase:', error);
    } finally {
      setLocations([]);
      setIsLoading(false);
    }
  };

  // Category management with Supabase
  const addCategory = async (name: string) => {
    setIsLoading(true);
    
    const newCategoryData = {
      name,
      user_id: ANONYMOUS_USER_ID
    };
    
    try {
      // Try to save to Supabase first
      const savedCategory = await categoryService.addCategory(newCategoryData);
      
      if (savedCategory) {
        setCategories([...categories, savedCategory]);
      } else {
        // If Supabase fails, fallback to client-side ID generation
        const newCat: Category = { id: generateId(), name };
        setCategories([...categories, newCat]);
      }
    } catch (error) {
      console.error('Error adding category to Supabase:', error);
      // Fallback to client-side ID
      const newCat: Category = { id: generateId(), name };
      setCategories([...categories, newCat]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeCategory = async (id: string) => {
    setIsLoading(true);
    
    try {
      // Try to delete from Supabase first
      await categoryService.deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category from Supabase:', error);
    } finally {
      // Always update the local state regardless of Supabase result
      setCategories(categories.filter(c => c.id !== id));
      // Optional: clear categoryId from locations using this category
      setLocations(locations.map(loc => loc.categoryId === id ? { ...loc, categoryId: undefined } : loc));
      setIsLoading(false);
    }
  };

  const updateCategory = async (id: string, name: string) => {
    setIsLoading(true);
    
    try {
      // Try to update in Supabase first
      await categoryService.updateCategory(id, name);
    } catch (error) {
      console.error('Error updating category in Supabase:', error);
    } finally {
      // Always update the local state regardless of Supabase result
      setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
      setIsLoading(false);
    }
  };

  const clearCategories = async () => {
    setIsLoading(true);
    
    try {
      // In a full implementation, we would have a batch delete endpoint
      // For now, we'll delete each category individually
      await Promise.all(categories.map(cat => categoryService.deleteCategory(cat.id)));
    } catch (error) {
      console.error('Error clearing categories from Supabase:', error);
    } finally {
      setCategories([]);
      setLocations(locations.map(loc => ({ ...loc, categoryId: undefined })));
      setIsLoading(false);
    }
  };

  return (
    <MapContext.Provider
      value={{
        locations,
        distances,
        addLocation,
        removeLocation,
        updateLocation,
        clearLocations,
        fetchDrivingRoutes,
        categories,
        addCategory,
        removeCategory,
        updateCategory,
        clearCategories,
        isLoading
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
} 