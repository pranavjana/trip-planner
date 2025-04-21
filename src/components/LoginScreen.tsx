'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (login(passcode)) {
      // Successful login is handled by the context
    } else {
      setError('Invalid passcode. Please try again.');
      setPasscode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bali Trip Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Enter passcode to access</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="passcode" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              required
            />
            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 dark:bg-blue-700 text-white py-3 rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition duration-200"
            >
              Enter
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need the passcode? Contact the trip organizer.
          </p>
        </div>
      </div>
    </div>
  );
} 