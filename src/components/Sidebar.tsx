'use client';

import React, { useState } from 'react';
import { useMap } from '../context/MapContext';
import LocationSearch from './LocationSearch';
import { Category, Location } from '../types';
import { useAuth } from '../context/AuthContext';

// Helper function to format time in hours and minutes
const formatDuration = (seconds: number): string => {
  if (!seconds) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} min`;
  }
};

export default function Sidebar() {
  const {
    locations,
    distances,
    removeLocation,
    clearLocations,
    fetchDrivingRoutes,
    categories,
    addCategory,
    removeCategory,
    clearCategories,
  } = useMap();
  const { logout } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  // For collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  // For route planner
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');

  const handleRefreshRoutes = () => {
    if (locations.length >= 2) {
      fetchDrivingRoutes();
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Find route between selected locations
  const findRoute = () => {
    if (fromLocationId && toLocationId) {
      fetchDrivingRoutes(fromLocationId, toLocationId);
    }
  };

  // Group locations by category
  const locationsByCategory: Record<string, Location[]> = {};
  // Add "Uncategorized" group
  locationsByCategory['uncategorized'] = [];
  
  // Initialize categories
  categories.forEach(cat => {
    locationsByCategory[cat.id] = [];
  });
  
  // Group locations
  locations.forEach(location => {
    if (location.categoryId && locationsByCategory[location.categoryId]) {
      locationsByCategory[location.categoryId].push(location);
    } else {
      locationsByCategory['uncategorized'].push(location);
    }
  });

  // Get category name by id
  const getCategoryName = (categoryId: string): string => {
    if (categoryId === 'uncategorized') return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-gray-800 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Bali Trip Planner</h2>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
        >
          <span>Logout</span>
        </button>
      </div>
      
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={clearLocations}
          className="px-3 py-1.5 bg-red-500 text-white rounded text-sm"
          disabled={locations.length === 0}
        >
          Clear All Locations
        </button>
        <button
          onClick={handleRefreshRoutes}
          className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm"
          disabled={locations.length < 2}
        >
          Refresh Routes
        </button>
      </div>
      
      {/* Category Management */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Categories</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="New category"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button
            onClick={() => { 
              if (newCategoryName.trim()) {
                addCategory(newCategoryName); 
                setNewCategoryName('');
              }
            }}
            disabled={!newCategoryName.trim()}
            className="px-3 py-1.5 bg-green-500 text-white rounded text-sm"
          >
            Add
          </button>
        </div>
        {categories.length > 0 ? (
          <ul className="space-y-1 mb-2">
            {categories.map(cat => (
              <li key={cat.id} className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="selectedCategory"
                    value={cat.id}
                    checked={selectedCategoryId === cat.id}
                    onChange={() => setSelectedCategoryId(cat.id)}
                    className="mr-2"
                  />
                  <span>{cat.name}</span>
                </label>
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No categories yet</p>
        )}
        <button
          onClick={clearCategories}
          disabled={categories.length === 0}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Categories
        </button>
      </div>
      
      {/* Search Locations */}
      <LocationSearch selectedCategoryId={selectedCategoryId} />
      
      {/* Locations By Category */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Saved Locations ({locations.length})</h3>
        {locations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Click on the map or search to add locations
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(locationsByCategory).map(([categoryId, locs]) => 
              locs.length > 0 && (
                <div 
                  key={categoryId}
                  className="border rounded-md overflow-hidden dark:border-gray-700"
                >
                  <button 
                    className="w-full p-2 text-left bg-gray-100 dark:bg-gray-700 font-medium flex justify-between items-center"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    <span>{getCategoryName(categoryId)} ({locs.length})</span>
                    <span>{expandedCategories[categoryId] ? '▼' : '►'}</span>
                  </button>
                  
                  {expandedCategories[categoryId] && (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {locs.map((location, index) => (
                        <li
                          key={location.id}
                          className="p-3 bg-white dark:bg-gray-800 flex justify-between items-start"
                        >
                          <div>
                            <p className="font-medium">
                              {location.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {location.coordinates.map(c => c.toFixed(4)).join(', ')}
                            </p>
                          </div>
                          <button
                            onClick={() => removeLocation(location.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            aria-label="Remove location"
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
      
      {/* Route Planner */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Route Planner</h3>
        {locations.length < 2 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Add at least two locations to plan a route
          </p>
        ) : (
          <>
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">From</label>
                <select 
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                >
                  <option value="">Select a starting point</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <select 
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                >
                  <option value="">Select a destination</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={findRoute}
              disabled={!fromLocationId || !toLocationId}
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              Show Route
            </button>
          </>
        )}
      </div>
      
      {/* Route Details */}
      {distances.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Route Details</h3>
          <ul className="space-y-2">
            {distances.map((distance, index) => (
              <li
                key={index}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">
                    {distance.from.name} 
                    <span className="mx-2">→</span> 
                    {distance.to.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Direct:</span> {distance.directDistance.toFixed(2)} km
                    </p>
                    {distance.drivingDistance ? (
                      <p>
                        <span className="font-medium">By car:</span> {distance.drivingDistance.toFixed(2)} km
                      </p>
                    ) : (
                      <p className="text-gray-400">Loading driving distance...</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {distance.drivingDuration ? (
                      <>
                        <p>
                          <span className="font-medium">Drive time:</span> {formatDuration(distance.drivingDuration)}
                        </p>
                        <p className="text-gray-400">
                          {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} → {' '}
                          {new Date(Date.now() + distance.drivingDuration * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">Loading travel time...</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 