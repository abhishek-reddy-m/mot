"use client";

import React from 'react';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function SearchBar() {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white/98 backdrop-blur-md p-3 sm:p-4 shadow-2xl border border-white/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {/* Location */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <select className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white appearance-none text-sm text-gray-800 font-medium">
              <option value="">Los Angeles Areas</option>
              <option value="hollywood">Hollywood & Highland</option>
              <option value="beverly-hills">Beverly Hills</option>
              <option value="santa-monica">Santa Monica Beach</option>
              <option value="west-hollywood">West Hollywood</option>
              <option value="downtown">Downtown Los Angeles</option>
              <option value="venice">Venice Beach</option>
              <option value="malibu">Malibu</option>
              <option value="pasadena">Pasadena</option>
              <option value="bel-air">Bel Air</option>
              <option value="century-city">Century City</option>
              <option value="manhattan-beach">Manhattan Beach</option>
              <option value="rodeo-drive">Rodeo Drive</option>
            </select>
          </div>
        </div>

        {/* Check-in */}
        <div className="relative">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <input 
              type="date" 
              placeholder="Check-in"
              className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-800 font-medium"
            />
          </div>
        </div>

        {/* Check-out */}
        <div className="relative">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <input 
              type="date" 
              placeholder="Check-out"
              className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-800 font-medium"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="relative">
          <div className="relative">
            <Users className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
            <select className="w-full p-2 pl-8 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent appearance-none bg-white text-sm text-gray-800 font-medium">
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
      <Link href="/properties" className="block w-full">
        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold text-white shadow-xl transition-all duration-300 py-3 text-sm hover:shadow-2xl transform hover:scale-[1.01]"
        >
          <Search className="h-4 w-4 mr-2" />
          Find Casa Blanca Hotels
        </Button>
      </Link>
    </div>
  );
}
