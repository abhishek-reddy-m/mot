'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

type PreviewImage = {
  file: File;
  preview: string;
};

export default function AddRoomTypePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<{id: string, name: string}[]>([]);
  const [selectedImages, setSelectedImages] = useState<PreviewImage[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: PreviewImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`File "${file.name}" is not an image`);
        continue;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB`);
        continue;
      }
      
      newImages.push({
        file,
        preview: URL.createObjectURL(file)
      });
    }
    
    setSelectedImages([...selectedImages, ...newImages]);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const amenitiesArray = formData.amenities.split(',').map(item => item.trim()).filter(item => item);
      
      // First, create the room type
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

      if (!response.ok) {
        throw new Error('Error creating room type');
      }

      const roomType = await response.json();

      // If we have images, upload them
      if (selectedImages.length > 0) {
        const base64Images: string[] = [];
        
        for (const img of selectedImages) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(img.file);
          });
          base64Images.push(base64);
        }

        // Upload photos
        const photoResponse = await fetch(`/api/admin/room-types/${roomType.id}/photos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images: base64Images }),
        });

        if (!photoResponse.ok) {
          console.error('Failed to upload photos, but room type was created');
        }
      }

      router.push('/admin/room-types');
    } catch (error) {
      setError('Error creating room type. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Define a strongly typed event handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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

              {/* Photo Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type Photos
                </label>
                <div className="space-y-4">
                  {/* Upload Button */}
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Photos
                    </Button>
                    <span className="text-sm text-gray-500">
                      Max 5MB per image. JPG, PNG, GIF supported.
                    </span>
                  </div>

                  {/* Selected Images Preview */}
                  {selectedImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedImages.map((img, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg overflow-hidden border border-gray-200"
                        >
                          <img
                            src={img.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                              Main
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No photos selected</p>
                      <p className="text-xs">The first photo will be set as the main image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

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
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
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
