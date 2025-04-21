'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';
import { useMap } from '../context/MapContext';
import { Category } from '../types';

// Interface for suggestion results from SearchBox API
interface SuggestionResult {
  name: string;
  mapbox_id: string;
  feature_type: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    country?: {
      name: string;
      country_code?: string;
    };
    region?: {
      name: string;
    };
    place?: {
      name: string;
    };
  };
  action: {
    endpoint: string;
    payload: {
      id: string;
      session_token?: string;
    };
  };
}

// Interface for retrieve results from SearchBox API
interface RetrieveResult {
  name: string;
  mapbox_id: string;
  feature_type: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    country?: {
      name: string;
      country_code?: string;
    };
    region?: {
      name: string;
    };
    place?: {
      name: string;
    };
  };
  coordinates: {
    longitude: number;
    latitude: number;
    accuracy?: string;
  };
  language: string;
  maki?: string;
}

// Custom result for parsed coordinates
interface CustomResult {
  id: string;
  name: string;
  place_formatted: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
  feature_type: string;
}

// Combined type for all possible results
type SearchResult = SuggestionResult | RetrieveResult | CustomResult;

// List of common POI categories (based on Mapbox categories)
const POI_CATEGORIES = [
  'airport', 'aerodrome', 'airfield', 'amusement_park', 'aquarium', 'art_gallery', 
  'attraction', 'bank', 'bar', 'beach', 'bus_station', 'cafe', 'campground', 
  'car_rental', 'casino', 'cinema', 'clinic', 'college', 'embassy', 'ferry_terminal', 
  'fuel', 'harbor', 'historic', 'hospital', 'hotel', 'landmark', 'library', 
  'monument', 'museum', 'park', 'pharmacy', 'place_of_worship', 'police', 
  'post_office', 'railway_station', 'restaurant', 'school', 'shopping_mall', 
  'stadium', 'subway_station', 'supermarket', 'theater', 'tourist_attraction', 
  'university', 'zoo'
];

// Props for LocationSearch component
interface LocationSearchProps {
  selectedCategoryId?: string;
}

export default function LocationSearch({ selectedCategoryId }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<RetrieveResult | CustomResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  // For name/category confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationCategoryId, setLocationCategoryId] = useState<string | undefined>(undefined);
  
  const { addLocation, categories } = useMap();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  // Generate a unique session token for MapBox Search API
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Check if input is coordinates (various formats)
  const parseCoordinates = (input: string): [number, number] | null => {
    // Try to match different coordinate formats
    
    // Format: "latitude, longitude" or "latitude longitude"
    const simpleFormat = /^\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*$/;
    
    // Format: "X.XXX° N/S, Y.YYY° E/W"
    const degreeFormat = /^\s*(\d+\.?\d*)\s*°\s*([NS])\s*[,\s]\s*(\d+\.?\d*)\s*°\s*([EW])\s*$/i;
    
    let match = input.match(simpleFormat);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      // Check if values are in valid range
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lng, lat]; // Mapbox uses [longitude, latitude]
      }
    }
    
    match = input.match(degreeFormat);
    if (match) {
      let lat = parseFloat(match[1]);
      const latDir = match[2].toUpperCase();
      let lng = parseFloat(match[3]);
      const lngDir = match[4].toUpperCase();
      
      // Apply direction
      if (latDir === 'S') lat = -lat;
      if (lngDir === 'W') lng = -lng;
      
      // Check if values are in valid range
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lng, lat]; // Mapbox uses [longitude, latitude]
      }
    }
    
    return null;
  };

  // Fetch suggestions using the Search Box API
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      // Check if input is coordinates
      const coordinates = parseCoordinates(query);
      if (coordinates) {
        // If coordinates are valid, create a custom result
        const customResult: CustomResult = {
          id: 'coordinates',
          name: `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
          place_formatted: `Custom Location (${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)})`,
          coordinates: {
            longitude: coordinates[0],
            latitude: coordinates[1]
          },
          feature_type: 'coordinate'
        };
        
        setSelectedResult(customResult);
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // Use the Mapbox Search Box API's suggest endpoint for interactive autocomplete
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?` +
          `q=${encodeURIComponent(query)}` +
          `&access_token=${MAPBOX_ACCESS_TOKEN}` +
          `&session_token=${sessionToken}` +
          `&proximity=115.1889,-8.4095` + // Bali coordinates for proximity bias
          `&country=id` + // Limit to Indonesia
          `&language=en` + // English results
          `&types=country,region,postcode,district,place,locality,neighborhood,address,poi` +
          `&limit=8`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch search suggestions');
        }
        
        const data = await response.json();
        // The Search Box API returns `suggestions` array
        let apiSuggestions: SuggestionResult[] = data.suggestions || [];

        // Handle special case for Bali Airport if not in results
        const lowerQuery = query.toLowerCase();
        const hasAirport = apiSuggestions.some(suggestion => 
          suggestion.name.toLowerCase().includes('ngurah rai') ||
          suggestion.name.toLowerCase().includes('denpasar international airport') ||
          (suggestion.full_address || suggestion.place_formatted || '').toLowerCase().includes('airport')
        );

        if (!hasAirport && 
            ((lowerQuery.includes('bali') && lowerQuery.includes('airport')) ||
             lowerQuery.includes('ngurah') ||
             lowerQuery.includes('denpasar air'))) {
          // Create a custom airport suggestion
          const airportSuggestion: SuggestionResult = {
            name: 'Ngurah Rai International Airport',
            mapbox_id: 'ngurah-rai-airport',
            feature_type: 'poi',
            place_formatted: 'Ngurah Rai International Airport (Denpasar), Bali, Indonesia',
            action: {
              endpoint: 'retrieve',
              payload: { id: 'ngurah-rai-airport', session_token: sessionToken }
            }
          };
          apiSuggestions.unshift(airportSuggestion);
        }
        
        setSuggestions(apiSuggestions);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search locations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionToken]
  );

  // Fetch detailed information about a selected suggestion
  const fetchSelectedResult = useCallback(
    async (suggestion: SuggestionResult) => {
      setIsLoading(true);
      setError(null);

      // For custom airport suggestion, return manually created result
      if (suggestion.mapbox_id === 'ngurah-rai-airport') {
        const customResult: RetrieveResult = {
          name: 'Ngurah Rai International Airport',
          mapbox_id: 'ngurah-rai-airport',
          feature_type: 'poi',
          place_formatted: 'Ngurah Rai International Airport (Denpasar), Bali, Indonesia',
          coordinates: {
            longitude: 115.167,
            latitude: -8.7484,
            accuracy: 'rooftop'
          },
          language: 'en',
          maki: 'airport'
        };
        setSelectedResult(customResult);
        setIsLoading(false);
        return;
      }

      try {
        // Use the Mapbox Search Box API's retrieve endpoint for details
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}?` +
          `access_token=${MAPBOX_ACCESS_TOKEN}` +
          `&session_token=${sessionToken}`
        );
        if (!response.ok) {
          throw new Error(`Failed to retrieve details: ${response.statusText}`);
        }
        const data = await response.json();
        // data.features should contain an array of feature details
        if (data.features && data.features.length > 0) {
          const feat = data.features[0];
          // Extract geometry coordinates
          const coords = (feat.geometry as any)?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            const [longitude, latitude] = coords;
            const retrieveResult: RetrieveResult = {
              name: feat.text || suggestion.name,
              mapbox_id: suggestion.mapbox_id,
              feature_type: feat.properties?.feature_type || suggestion.feature_type,
              place_formatted: feat.place_name || suggestion.place_formatted,
              coordinates: {
                longitude,
                latitude,
                accuracy: (feat.coordinates as any)?.accuracy
              },
              language: feat.properties?.language || 'en',
              maki: feat.properties?.maki
            };
            setSelectedResult(retrieveResult);
          } else {
            throw new Error('Retrieved feature has no valid geometry coordinates');
          }
        } else {
          throw new Error('No details found for selected location');
        }
      } catch (err) {
        console.error('Retrieve error:', err);
        setError('Failed to get location details. Please try again.');
        // Fallback to suggestion
        const fallbackResult: RetrieveResult = {
          name: suggestion.name,
          mapbox_id: suggestion.mapbox_id,
          feature_type: suggestion.feature_type,
          place_formatted: suggestion.place_formatted || suggestion.name,
          coordinates: {
            // Use fallback Bali
            longitude: 115.1889,
            latitude: -8.4095
          },
          language: 'en'
        };
        setSelectedResult(fallbackResult);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionToken]
  );

  // Handle input changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
        setSelectedResult(null);
      }
    }, 300); // 300ms debounce time

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  // Handle clicks outside the search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionSelect = (suggestion: SuggestionResult) => {
    fetchSelectedResult(suggestion);
    setSuggestions([]);
  };

  const handleAddLocation = () => {
    if (selectedResult) {
      // Use the actual name of the location first, then fallback to formatted address
      setLocationName(selectedResult.name || selectedResult.place_formatted || 'Unnamed Location');
      setLocationCategoryId(selectedCategoryId);
      // Show the modal for confirmation
      setShowConfirmModal(true);
    }
  };

  // New function to handle the final addition after confirmation
  const handleConfirmAddLocation = () => {
    if (selectedResult) {
      console.log('Adding location with coordinates:', selectedResult.coordinates);
      
      // Ensure we have valid coordinates
      if (!selectedResult.coordinates || 
          typeof selectedResult.coordinates.longitude !== 'number' || 
          typeof selectedResult.coordinates.latitude !== 'number') {
        console.error('Invalid coordinates in selected result:', selectedResult);
        setError('Location has invalid coordinates. Please try another search.');
        return;
      }
      
      const coordinates: [number, number] = [
        selectedResult.coordinates.longitude,
        selectedResult.coordinates.latitude
      ];
      
      // If the user has entered a custom name, use that
      // Otherwise use the official place name from the API result
      // Only fall back to address if no name is available
      const finalName = locationName.trim() || 
                        selectedResult.name || 
                        selectedResult.place_formatted?.split(',')[0] || 
                        'Unnamed Location';
      
      console.log('Final coordinates being added:', coordinates);
      console.log('Final name being used:', finalName);
      addLocation(finalName, coordinates, locationCategoryId);
      setSearchQuery('');
      setSelectedResult(null);
      setIsFocused(false);
      setShowConfirmModal(false);
    }
  };

  // Get an icon for the place type
  const getPlaceIcon = (feature: SuggestionResult | RetrieveResult | CustomResult) => {
    const type = feature.feature_type || '';
    
    if (type === 'coordinate') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (type === 'poi' && (
      feature.name.toLowerCase().includes('airport') || 
      (feature.place_formatted && feature.place_formatted.toLowerCase().includes('airport')) ||
      ('maki' in feature && feature.maki === 'airport')
    )) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11.43a1 1 0 00-.725-.962l-5-1.429a1 1 0 01.725-1.962l5 1.429a1 1 0 00.725-.962V3.5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v5.007a1 1 0 00.725.962l5 1.429a1 1 0 01-.725 1.962l-5-1.429A1 1 0 0011 11.43v4.144a1 1 0 00.725.962l5 1.429A1 1 0 0018 16.571l-7-14z" />
        </svg>
      );
    }
    
    if (type === 'poi') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (type === 'address') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    );
  };
  
  // Format the display name for a suggestion
  const getDisplayName = (suggestion: SuggestionResult) => {
    if (suggestion.place_formatted) {
      return suggestion.place_formatted;
    }
    
    let displayName = suggestion.name;
    
    // Add context information if available
    if (suggestion.context) {
      if (suggestion.context.place?.name) {
        displayName += `, ${suggestion.context.place.name}`;
      }
      if (suggestion.context.region?.name) {
        displayName += `, ${suggestion.context.region.name}`;
      }
      if (suggestion.context.country?.name) {
        displayName += `, ${suggestion.context.country.name}`;
      }
    }
    
    return displayName;
  };

  // Check if selectedResult has valid coordinates
  const hasValidCoordinates = selectedResult && 
    selectedResult.coordinates && 
    typeof selectedResult.coordinates.latitude === 'number' && 
    typeof selectedResult.coordinates.longitude === 'number';

  return (
    <div className="mb-6" ref={searchContainerRef}>
      <h3 className="text-lg font-semibold mb-2">Search Locations</h3>
      
      <div className="relative">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search for places in Bali or enter coordinates"
            className="w-full p-2 pr-10 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isLoading ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedResult(null);
                  setSuggestions([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                &times;
              </button>
            )
          )}
        </div>
        
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        
        {isFocused && suggestions.length > 0 && !selectedResult && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto dark:border-gray-600">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.mapbox_id}
                className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 dark:border-gray-600"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-blue-500 mr-2">
                    {getPlaceIcon(suggestion)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getDisplayName(suggestion)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedResult && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-blue-500 mr-2 mt-1">
                {getPlaceIcon(selectedResult)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{selectedResult.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedResult.place_formatted || ''}
                </div>
                {hasValidCoordinates && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Coordinates: {selectedResult.coordinates.latitude.toFixed(5)}, {selectedResult.coordinates.longitude.toFixed(5)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={!hasValidCoordinates}
              >
                Add to Map
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <p>Search by name or coordinates. Try:</p>
        <p className="mt-1">• "Bali Airport" • "Seminyak Beach" • "8.66326° S, 115.15880° E"</p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Add Location to Trip</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location details:</p>
              <p className="font-medium text-gray-800 dark:text-white">{selectedResult.name || 'Unnamed Location'}</p>
              {selectedResult.place_formatted && 
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedResult.place_formatted}</p>
              }
            </div>
            
            <div className="mb-4">
              <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Name
              </label>
              <input
                id="location-name"
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Enter a name for this location"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                id="category-select"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                value={locationCategoryId || ''}
                onChange={(e) => setLocationCategoryId(e.target.value || undefined)}
              >
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
                onClick={handleConfirmAddLocation}
              >
                Add to Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 