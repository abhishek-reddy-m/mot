'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bed, Users, Edit, Trash2, Plus, Search, DollarSign, Loader2 } from 'lucide-react';

type Property = {
  id: string;
  name: string;
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  totalRooms: number;
  amenities: string[];
  isActive: boolean;
  property: {
    id: string;
    name: string;
  };
  _count?: {
    bookings: number;
  };
};

export default function AdminRoomTypesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/admin/properties');
        if (!response.ok) {
          throw new Error(`Failed to fetch properties: ${response.status}`);
        }
        const data = await response.json();
        setProperties(data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties');
      }
    };

    const fetchRoomTypes = async () => {
      try {
        setLoading(true);
        console.log('Fetching room types...');
        
        // First try a non-auth test
        const testResponse = await fetch('/api/admin/room-types', { method: 'HEAD' });
        console.log('Test HEAD response:', testResponse.status, testResponse.ok);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('Test data:', testData);
        } else {
          console.log('Test response error:', await testResponse.text());
        }
        
        // Now try the actual GET request
        const response = await fetch('/api/admin/room-types');
        console.log('Room types response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error text:', errorText);
          throw new Error(`Failed to fetch room types: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Room types data received:', data.length);
        setRoomTypes(data);
      } catch (err) {
        console.error('Error fetching room types:', err);
        setError('Failed to load room types');
      } finally {
        setLoading(false);
      }
    };

    // Also test the auth API
    const testAuth = async () => {
      try {
        const response = await fetch('/api/test-auth');
        console.log('Auth test response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Auth test data:', data);
        } else {
          console.log('Auth test error:', await response.text());
        }
      } catch (err) {
        console.error('Auth test error:', err);
      }
    };

    fetchProperties();
    fetchRoomTypes();
    testAuth();
  }, []);

  // Filter room types by property and search term
  const filteredRoomTypes = roomTypes.filter(roomType => {
    const matchesSearch = 
      roomType.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (roomType.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesProperty = selectedPropertyId ? roomType.property.id === selectedPropertyId : true;
    
    return matchesSearch && matchesProperty;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Types</h1>
          <p className="text-gray-600">Manage room types and configurations</p>
        </div>
        <Button 
          className="flex items-center space-x-2"
          onClick={() => router.push('/admin/room-types/add')}
        >
          <Plus className="h-4 w-4" />
          <span>Add Room Type</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search room types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <div className="w-full md:w-auto">
          <select
            className="w-full md:w-64 p-2 border rounded-md"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
          >
            <option value="">All Properties</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading room types...</p>
          </div>
        </div>
      ) : (
        /* Room Types Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRoomTypes.map((roomType) => (
            <Card key={roomType.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <CardTitle className="text-lg">{roomType.name}</CardTitle>
                    </div>
                    <div className="mt-1 text-sm text-blue-600 font-medium">
                      {roomType.property.name}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-green-600">${Number(roomType.basePrice).toFixed(2)}/night</span>
                  </div>
                </div>
                <CardDescription className="mt-2">{roomType.description || 'No description available'}</CardDescription>
                <div className="mt-2">
                  <Badge variant={roomType.isActive ? "default" : "secondary"}>
                    {roomType.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="font-semibold">{roomType.capacity}</span>
                    </div>
                    <span className="text-gray-600 text-xs">Max Guests</span>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{roomType.totalRooms}</div>
                    <span className="text-gray-600 text-xs">Total Rooms</span>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{roomType.totalRooms - (roomType._count?.bookings || 0)}</div>
                    <span className="text-gray-600 text-xs">Available</span>
                  </div>
                </div>

                {roomType.amenities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-1">
                      {roomType.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/admin/room-types/${roomType.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredRoomTypes.length === 0 && (
        <div className="text-center py-12">
          <Bed className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No room types found</h3>
          <p className="text-gray-600">
            {selectedPropertyId 
              ? "No room types for the selected property. Try selecting a different property or creating new room types." 
              : "Try adjusting your search terms or creating new room types."}
          </p>
        </div>
      )}
      
    </div>
  );
}
