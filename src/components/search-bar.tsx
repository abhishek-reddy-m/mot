"use client";

import React, { useState, useEffect } from 'react';
import { Search, Building2, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { normalizeDate, storeBookingSearch } from '@/lib/date-utils';

type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface SearchBarProps {
  variant?: 'default' | 'compact';
  initialValues?: {
    propertyId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
}

export function SearchBar({ variant = 'default', initialValues = {} }: SearchBarProps) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(initialValues.propertyId || '');
  // Set default check-in to tomorrow if not provided
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  // Set default check-out to the day after tomorrow if not provided
  const getDayAfterTomorrow = () => {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return dayAfterTomorrow.toISOString().split('T')[0];
  };
  
  const [checkIn, setCheckIn] = useState(initialValues.checkIn || getTomorrow());
  const [checkOut, setCheckOut] = useState(initialValues.checkOut || getDayAfterTomorrow());
  const [guests, setGuests] = useState(initialValues.guests || '');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/properties/dropdown');
        if (response.ok) {
          const data = await response.json();
          setProperties(data);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Build the query string for search
    const params = new URLSearchParams();
    
    if (selectedProperty) params.append('propertyId', selectedProperty);
    
    // Generate a timestamp for cache busting to always get fresh availability data
    const timestamp = new Date().getTime().toString();
    
    // Standardize date format to YYYY-MM-DD for consistency throughout the app
    if (checkIn) {
      // Use our utility for date normalization
      const formattedCheckIn = normalizeDate(checkIn);
      console.log(`Original checkIn: ${checkIn}, Normalized: ${formattedCheckIn}`);
      
      // Store the clean date for the actual search
      params.append('checkIn', formattedCheckIn);
      
      // Always add a timestamp for cache busting
      params.append('_t', timestamp);
    }
    
    if (checkOut) {
      // Use our utility for date normalization with fallback to tomorrow (1 day offset) if invalid
      const formattedCheckOut = normalizeDate(checkOut, 1);
      console.log(`Original checkOut: ${checkOut}, Normalized: ${formattedCheckOut}`);
      
      params.append('checkOut', formattedCheckOut);
    }
    
    if (guests) params.append('guests', guests);
    
    const queryString = params.toString();
    console.log(`Navigating to search with params: ${queryString}`);
    
    // Use router.replace instead of push to force a full page refresh
    // This ensures all components fully reinitialize with the new dates
    // and we get fresh availability data from the API
    router.replace(`/properties?${queryString}`);
    
    // Use our utility function to store search parameters consistently
    const formattedCheckIn = normalizeDate(checkIn);
    const formattedCheckOut = normalizeDate(checkOut, 1);
    
    console.log('Storing search dates in session storage:', {
      original: { checkIn, checkOut },
      formatted: { checkIn: formattedCheckIn, checkOut: formattedCheckOut }
    });
    
    // Use our utility function for storing search data consistently
    storeBookingSearch({
      checkIn: formattedCheckIn,
      checkOut: formattedCheckOut,
      guests,
      propertyId: selectedProperty
    });
  };

  // Style classes based on variant
  const formClasses = {
    default: "mx-auto max-w-4xl rounded-2xl bg-white/98 backdrop-blur-md p-3 sm:p-4 shadow-2xl border border-white/30",
    compact: "mx-auto max-w-4xl rounded-xl bg-white p-3 sm:p-4 shadow-md border border-gray-100"
  };

  const buttonClasses = {
    default: "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold text-white shadow-xl transition-all duration-300 py-3 text-sm hover:shadow-2xl transform hover:scale-[1.01]",
    compact: "w-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-all duration-200 py-2 text-sm"
  };

  const gridClasses = {
    default: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3",
    compact: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2"
  };
  
  return (
    <form onSubmit={handleSearch} className={formClasses[variant]}>
      <div className={gridClasses[variant]}>
        {/* Property Selection */}
        <div className="relative">
          <div className="relative">
            <Building2 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <select 
              className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white appearance-none text-sm text-gray-800 font-medium"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Check-in */}
        <div className="relative">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <label className="absolute -top-5 left-0 text-xs text-blue-600 font-semibold">Check-in Date</label>
              <input 
                type="date" 
                aria-label="Check-in date"
                className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-800 font-medium"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  // If check-out date is before new check-in date, update it
                  if (e.target.value > checkOut) {
                    const nextDay = new Date(e.target.value);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setCheckOut(nextDay.toISOString().split('T')[0]);
                  }
                }}
                min={new Date().toISOString().split('T')[0]} // Today's date
              />
            </div>
          </div>
        </div>

        {/* Check-out */}
        <div className="relative">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <label className="absolute -top-5 left-0 text-xs text-blue-600 font-semibold">Check-out Date</label>
              <input 
                type="date" 
                aria-label="Check-out date"
                className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-800 font-medium"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]} // Minimum is check-in date or today
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {checkIn && checkOut && new Date(checkOut) > new Date(checkIn) && (
              <span>
                {Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} night{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Guests */}
        <div className="relative">
          <div className="relative">
            <Users className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <select 
              className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent appearance-none bg-white text-sm text-gray-800 font-medium"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            >
              <option value="">Select Guests</option>
              <option value="1">1 Guest</option>
              <option value="2">2 Guests</option>
              <option value="3">3 Guests</option>
              <option value="4">4 Guests</option>
              <option value="5">5+ Guests</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <Button 
        type="submit"
        className={`${buttonClasses[variant]} relative overflow-hidden group`}
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></span>
        <Search className="h-4 w-4 mr-2 relative z-10" />
        <span className="relative z-10">
          {checkIn && checkOut ? 
            `Update Availability for ${new Date(`${checkIn}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${new Date(`${checkOut}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}` : 
            'Find Available Properties'}
        </span>
        {initialValues.checkIn && initialValues.checkOut && (checkIn !== initialValues.checkIn || checkOut !== initialValues.checkOut) && (
          <span className="ml-1 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-full relative z-10">New Dates</span>
        )}
      </Button>
    </form>
  );
}
