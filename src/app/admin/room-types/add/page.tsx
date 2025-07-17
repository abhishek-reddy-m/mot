'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

export default function AddRoomTypePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    basePrice: '',
    propertyId: '',
    amenities: '',
    totalRooms: '0'
  });

  // Define a type for the property data
  type PropertyData = {
    id: string;
    name: string;
    // Add other fields as needed
  };
  
  useEffect(() => {
    // Fetch properties from API
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/admin/properties');
        if (response.ok) {
          const data = await response.json();
          setProperties(data.map((property: PropertyData) => ({ id: property.id, name: property.name })));
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    };

    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const amenitiesArray = formData.amenities.split(',').map(item => item.trim()).filter(item => item);
      
      const response = await fetch('/api/admin/room-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
          basePrice: parseFloat(formData.basePrice),
          totalRooms: parseInt(formData.totalRooms),
          // Initially, all rooms are available
          availableRooms: parseInt(formData.totalRooms),
          amenities: amenitiesArray
        }),
      });

      if (response.ok) {
        router.push('/admin/room-types');
      } else {
        alert('Error creating room type. Please try again.');
      }
    } catch (error) {
      alert('Error creating room type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Room Type</h1>
          <p className="text-gray-600">Create a new room type configuration</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Room Type Information</CardTitle>
          <CardDescription>
            Enter the details for the new room type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Standard Double, Deluxe Suite"
                />
              </div>

              <div>
                <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <select
                  id="propertyId"
                  name="propertyId"
                  required
                  value={formData.propertyId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the room type..."
                />
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Capacity *
                </label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="4"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of guests
                </p>
              </div>

              <div>
                <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (per night) *
                </label>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={handleChange}
                  placeholder="99.99"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Base price in USD
                </p>
              </div>
              
              <div>
                <label htmlFor="totalRooms" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Room Count *
                </label>
                <Input
                  id="totalRooms"
                  name="totalRooms"
                  type="number"
                  required
                  min="0"
                  value={formData.totalRooms}
                  onChange={handleChange}
                  placeholder="10"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of rooms of this type
                </p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="amenities" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Amenities
                </label>
                <Input
                  id="amenities"
                  name="amenities"
                  type="text"
                  value={formData.amenities}
                  onChange={handleChange}
                  placeholder="Free WiFi, Air Conditioning, Private Bathroom, Mini Fridge (separate with commas)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate multiple amenities with commas
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  'Creating...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Room Type
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
