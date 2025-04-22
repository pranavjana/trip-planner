'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE } from '../config/mapbox';
import { BALI_CENTER, DEFAULT_ZOOM } from '../utils/mapUtils';
import { useMap } from '../context/MapContext';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { Category, Location as MapLocation } from '../types';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Line layer source ID
const ROUTE_SOURCE_ID = 'route-source';
// Default pin color when no category is assigned
const DEFAULT_PIN_COLOR = '#4B5563'; // gray-600 - slightly darker for better visibility

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState('');
  const [isRoutesVisible, setIsRoutesVisible] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCoords, setNewLocationCoords] = useState<[number, number] | null>(null);
  const [newLocationCategoryId, setNewLocationCategoryId] = useState<string | undefined>(undefined);
  
  const { locations, addLocation, distances, fetchDrivingRoutes, categories } = useMap();

  // Function to get a color for a location based on its category
  const getLocationColor = useCallback((location: MapLocation): string => {
    if (!location.categoryId) return DEFAULT_PIN_COLOR;
    
    const category = categories.find(cat => cat.id === location.categoryId);
    return category?.color || DEFAULT_PIN_COLOR;
  }, [categories]);
  
  // Function to create SVG marker element with specific color
  const createMarkerElement = useCallback((location: MapLocation, index: number): HTMLDivElement => {
    const color = getLocationColor(location);
    
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.width = '25px';
    el.style.height = '25px';
    el.style.cursor = 'pointer';
    
    // Create a colored SVG pin dynamically
    const svgPin = `
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0ZM16 
        23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C19.866 9 23 12.134 23 16C23 19.866 19.866 23 16 23Z" fill="${color}"/>
      </svg>
    `;
    
    // Convert the SVG to a data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPin)}`;
    el.style.backgroundImage = `url('${svgDataUrl}')`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.filter = `drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.06))`;
    
    // Add index number to the marker
    const indexEl = document.createElement('div');
    indexEl.className = 'marker-index';
    indexEl.textContent = (index + 1).toString();
    indexEl.style.position = 'absolute';
    indexEl.style.top = '5px';
    indexEl.style.left = '0';
    indexEl.style.right = '0';
    indexEl.style.textAlign = 'center';
    indexEl.style.color = 'white';
    indexEl.style.fontWeight = 'bold';
    indexEl.style.fontSize = '12px';
    el.appendChild(indexEl);
    
    return el;
  }, [getLocationColor]);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    if (!mapContainer.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: BALI_CENTER,
      zoom: DEFAULT_ZOOM
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control (shows user location)
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }),
      'top-right'
    );

    // Removed map click handler - users can no longer add locations by clicking on the map
    
    // Add source and layer for connecting lines when map loads
    map.current.on('load', () => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      // Add an empty GeoJSON source for the route lines
      mapInstance.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        } as FeatureCollection
      });

      // Add a layer to render the route line
      mapInstance.addLayer({
        id: 'route-layer',
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.7
        }
      });
    });
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // When locations change, fetch driving routes
  useEffect(() => {
    if (locations.length >= 2 && isRoutesVisible) {
      fetchDrivingRoutes();
    }
  }, [locations, isRoutesVisible, fetchDrivingRoutes]);

  // Update map with actual driving routes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !isRoutesVisible) return;

    try {
      // Create a GeoJSON FeatureCollection for all routes
      const routeFeatures = distances
        .filter(distance => distance.routeGeometry)
        .map(distance => {
          // Ensure routeGeometry is properly typed as a GeoJSON LineString
          const geometry: LineString = {
            type: 'LineString',
            coordinates: distance.routeGeometry?.coordinates || []
          };
          
          return {
            type: 'Feature',
            properties: {
              from: distance.from.name,
              to: distance.to.name,
              distance: distance.drivingDistance,
              duration: distance.drivingDuration
            },
            geometry
          } as Feature;
        });

      // Update the route source with new features
      const source = map.current.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: routeFeatures
        } as FeatureCollection);
      }
    } catch (error) {
      console.error('Error updating route lines:', error);
    }
  }, [distances, isRoutesVisible]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers that aren't in the locations array
    Object.keys(markers.current).forEach(id => {
      if (!locations.find(loc => loc.id === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add or update markers for all locations
    locations.forEach((location, index) => {
      // If marker already exists, update it
      if (markers.current[location.id]) {
        // Remove old marker
        markers.current[location.id].remove();
        delete markers.current[location.id];
      }
      
      // Create a new marker with appropriate color
      const el = createMarkerElement(location, index);
      
      // Create the popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <h3 class="font-bold text-sm">${location.name}</h3>
          <p class="text-xs">${location.categoryId ? `Category: ${categories.find(c => c.id === location.categoryId)?.name || 'Unknown'}` : ''}</p>
          <p class="text-xs">Coordinates: ${location.coordinates.map(c => c.toFixed(4)).join(', ')}</p>
        `);
      
      // Create and add the marker
      const mapInstance = map.current;
      if (mapInstance) {
        const marker = new mapboxgl.Marker(el)
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(mapInstance);
        
        markers.current[location.id] = marker;
      }
    });
    
    // If we have locations, fit the map to show all markers
    if (locations.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach(location => {
        bounds.extend(location.coordinates);
      });
      
      map.current.fitBounds(bounds, {
        padding: 70,
        maxZoom: 15
      });
    }
  }, [locations, categories, createMarkerElement]);

  // Toggle route visibility
  const toggleRoutes = () => {
    setIsRoutesVisible(!isRoutesVisible);
  };

  // Handle form submission for new location
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clickedCoordinates || !locationName.trim()) return;
    
    addLocation(locationName, clickedCoordinates);
    setModalOpen(false);
    setLocationName('');
    setClickedCoordinates(null);
  };

  const handleCancelAdd = () => {
    setModalOpen(false);
    setLocationName('');
    setClickedCoordinates(null);
  };

  // Function to confirm adding a new location from the map
  const handleConfirmAddLocation = () => {
    if (newLocationCoords) {
      const name = newLocationName.trim() || `Location at ${newLocationCoords[1].toFixed(5)}, ${newLocationCoords[0].toFixed(5)}`;
      addLocation(name, newLocationCoords, newLocationCategoryId);
      setShowNameModal(false);
      setNewLocationCoords(null);
      setNewLocationName('');
      setNewLocationCategoryId(undefined);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Help overlay - small instructions */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-2 rounded shadow-md text-xs max-w-xs opacity-80">
        <p>Use the search bar to add locations to your trip</p>
      </div>
      
      {/* Map controls */}
      <div className="absolute top-4 right-16 flex gap-2">
        <button 
          onClick={toggleRoutes}
          className={`p-2 rounded shadow-md text-xs ${isRoutesVisible ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800'}`}
        >
          {isRoutesVisible ? 'Hide Routes' : 'Show Routes'}
        </button>
      </div>
      
      {/* Modal for adding a new location */}
      {modalOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/50 z-10">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Location</h2>
            <form onSubmit={handleAddLocation}>
              <div className="mb-4">
                <label htmlFor="locationName" className="block mb-2">
                  Location Name
                </label>
                <input
                  id="locationName"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Enter location name"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              {clickedCoordinates && (
                <div className="mb-4">
                  <p>
                    Coordinates: {clickedCoordinates.map(c => c.toFixed(4)).join(', ')}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Add Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Name Location Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Name Your Location</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Enter location name"
                autoFocus
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
              <select
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                value={newLocationCategoryId || ''}
                onChange={(e) => setNewLocationCategoryId(e.target.value || undefined)}
              >
                <option value="">No Category</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Coordinates</label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {newLocationCoords ? `${newLocationCoords[1].toFixed(5)}, ${newLocationCoords[0].toFixed(5)}` : ''}
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setNewLocationCoords(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddLocation}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Add to Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 