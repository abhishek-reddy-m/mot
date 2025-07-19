"use client";

import React, { useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function FamilyCabinChecker() {
  const router = useRouter();
  
  // Get dates a week from now for default values (since current dates show no availability)
  const getWeekFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };
  
  const getWeekPlusOneFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 8);
    return date.toISOString().split('T')[0];
  };
  
  const [checkIn, setCheckIn] = useState(getWeekFromNow());
  const [checkOut, setCheckOut] = useState(getWeekPlusOneFromNow());
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // We'll use the specific Family Cabin property ID
    // Note: This is a placeholder - you should use the actual ID of the Family Cabin
    const familyCabinId = "family-cabin"; 
    
    // Build the query string for search with the specific propertyId
    const params = new URLSearchParams();
    params.append('propertyId', familyCabinId);
    
    // Add dates with a timestamp to force refresh
    const timestamp = new Date().getTime();
    params.append('checkIn', `${checkIn}?t=${timestamp}`);
    params.append('checkOut', checkOut);
    params.append('guests', '6'); // Family Cabin is for up to 6 guests
    
    router.push(`/properties/${familyCabinId}?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
      <div className="text-center mb-3">
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Family Cabin Availability Checker</span>
      </div>
      
      <h3 className="text-lg font-bold mb-3">Try Different Dates for Family Cabin</h3>
      
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 block">New Check-in</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
              <input 
                type="date" 
                className="w-full p-1.5 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  // Update check-out if needed
                  if (e.target.value >= checkOut) {
                    const nextDay = new Date(e.target.value);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setCheckOut(nextDay.toISOString().split('T')[0]);
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 block">New Check-out</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
              <input 
                type="date" 
                className="w-full p-1.5 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn}
              />
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          {checkIn && checkOut && new Date(checkOut) > new Date(checkIn) && (
            <span>
              {Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} night stay
            </span>
          )}
        </div>
        
        <Button 
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-semibold py-2 text-sm"
        >
          <Search className="h-4 w-4 mr-2" />
          Check Family Cabin Availability
        </Button>
      </form>
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        Family Cabin: 2 bedrooms, sleeps up to 6 guests
      </div>
    </div>
  );
}
