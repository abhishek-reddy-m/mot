"use client";

import React, { useState } from 'react';
import { Calendar, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDateForDisplay } from '@/lib/date-utils';

export function QuickAvailability() {
  const router = useRouter();
  
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
  
  const [checkIn, setCheckIn] = useState(getTomorrow());
  const [checkOut, setCheckOut] = useState(getDayAfterTomorrow());
  const [guests, setGuests] = useState('2');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build the query string for search
    const params = new URLSearchParams();
    
    // Add timestamp to force cache busting and ensure fresh data
    const timestamp = new Date().getTime();
    
    // Ensure dates are properly formatted
    if (checkIn) {
      const formattedCheckIn = checkIn.trim().match(/^\d{4}-\d{2}-\d{2}$/) 
        ? checkIn.trim() 
        : new Date(checkIn).toISOString().split('T')[0];
      params.append('checkIn', formattedCheckIn);
      // Add timestamp as a separate parameter for cache busting
      params.append('_t', timestamp.toString());
    }
    
    if (checkOut) {
      const formattedCheckOut = checkOut.trim().match(/^\d{4}-\d{2}-\d{2}$/) 
        ? checkOut.trim() 
        : new Date(checkOut).toISOString().split('T')[0];
      params.append('checkOut', formattedCheckOut);
    }
    
    if (guests) {
      params.append('guests', guests);
    }
    
    // For easy debugging
    console.log(`Checking availability with params: ${params.toString()}`);
    
    // Store search parameters in sessionStorage for persistence
    sessionStorage.setItem('lastSearch', JSON.stringify({
      checkIn,
      checkOut,
      guests
    }));
    
    // Use replace instead of push to force a full reload and get fresh availability data
    router.replace(`/properties?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Check Room Availability</h3>
      
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Check-in Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
              <input 
                type="date" 
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
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
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Check-out Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
              <input 
                type="date" 
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {checkIn && checkOut && new Date(checkOut) > new Date(checkIn) && (
                <span>
                  {Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} night{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Number of Guests</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
              <select 
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent appearance-none bg-white text-sm"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
                <option value="5">5 Guests</option>
                <option value="6">6+ Guests</option>
              </select>
            </div>
          </div>
        </div>
        
        <Button 
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold text-white py-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
          <Search className="h-4 w-4 mr-2 animate-pulse" />
          <span className="relative">
            Check Room Availability for {formatDateForDisplay(checkIn, 'short')} - {formatDateForDisplay(checkOut, 'short')}
          </span>
        </Button>
        <div className="mt-2 text-center text-xs text-blue-600">
          Click to refresh availability for these dates
        </div>
      </form>
    </div>
  );
}
