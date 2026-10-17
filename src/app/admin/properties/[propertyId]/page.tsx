'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomDomainCard from '@/components/admin/CustomDomainCard';
import { CheckCircle2, Save, Loader2, ArrowLeft, Plus, Trash2, Upload, Star, X, Image as ImageIcon } from 'lucide-react';

type PropertyFormData = {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  amenities: string[];
  isActive: boolean;
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  totalRooms: number;
  availableRooms: number;
  amenities: string[];
  isActive: boolean;
};

type PropertyPhoto = {
  id: string;
  url: string;
  publicId: string;
  isMain: boolean;
  createdAt: string;
};

export default function EditPropertyPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const router = useRouter();
  // Use React.use() to unwrap the params promise
  const { propertyId } = use(params);
  
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    amenities: [],
    isActive: true
  });

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/properties/${propertyId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }
        
        const property = await response.json();
        
        setFormData({
          name: property.name || '',
          description: property.description || '',
          address: property.address || '',
          city: property.city || '',
          state: property.state || '',
          zipCode: property.zipCode || '',
          phone: property.phone || '',
          email: property.email || '',
          amenities: property.amenities || [],
          isActive: property.isActive
        });
        
        setRoomTypes(property.roomTypes || []);
        setPhotos(property.photos || []);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperty();
  }, [propertyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'isActive' ? value === 'true' : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update property');
      }
      
      setSuccess(true);
      
      // Redirect back to properties page after 2 seconds
      setTimeout(() => {
        router.push('/admin/properties');
      }, 2000);
      
    } catch (err: Error | unknown) {
      console.error('Error updating property:', err);
      setError(err instanceof Error ? err.message : 'Failed to update property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, newAmenity.trim()]
      });
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter(a => a !== amenity)
    });
  };

  // Photo management functions
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    setError('');

    try {
      const base64Images: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File "${file.name}" is not an image`);
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 5MB`);
        }
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        base64Images.push(base64);
      }

      // Upload to API
      const response = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: base64Images }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photos');
      }

      const result = await response.json();
      setPhotos([...photos, ...result.photos]);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete photo');
      }

      // Remove from local state
      const deletedPhoto = photos.find(p => p.id === photoId);
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      
      // If deleted photo was main and there are other photos, the first one becomes main
      if (deletedPhoto?.isMain && updatedPhotos.length > 0) {
        updatedPhotos[0].isMain = true;
      }
      
      setPhotos(updatedPhotos);
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  const setMainPhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set main photo');
      }

      // Update local state
      setPhotos(photos.map(p => ({
        ...p,
        isMain: p.id === photoId
      })));
    } catch (err) {
      console.error('Error setting main photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to set main photo');
    }
  };

  const navigateToRoomTypeEdit = (roomTypeId: string) => {
    router.push(`/admin/room-types/${roomTypeId}`);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/admin/properties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <h1 className="text-2xl font-bold">Edit Property</h1>
        </div>
      </div>
      
      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
          Property updated successfully!
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Property Name*</label>
                  <Input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Address*</label>
                    <Input 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City*</label>
                    <Input 
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">State*</label>
                    <Input 
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Zip Code*</label>
                    <Input 
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      name="isActive"
                      value={formData.isActive.toString()}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone*</label>
                    <Input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input 
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Property Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photos
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-500">
                    Max 5MB per image. JPG, PNG, GIF supported.
                  </span>
                </div>

                {/* Photos Grid */}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className={`relative group rounded-lg overflow-hidden border-2 ${
                          photo.isMain ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt="Property photo"
                          className="w-full h-32 object-cover"
                        />
                        {photo.isMain && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <Star className="h-3 w-3 mr-1" />
                            Main
                          </div>
                        )}
                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!photo.isMain && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setMainPhoto(photo.id)}
                              title="Set as main photo"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePhoto(photo.id)}
                            title="Delete photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No photos uploaded yet</p>
                    <p className="text-sm">Click "Upload Photos" to add images</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.amenities.map((amenity, index) => (
                    <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {formData.amenities.length === 0 && (
                    <div className="text-gray-500 text-sm">No amenities added yet.</div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Input 
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="Add new amenity"
                    className="flex-1"
                  />
                  <Button type="button" onClick={addAmenity}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Room Types</CardTitle>
                <Button
                  type="button"
                  onClick={() => router.push(`/admin/room-types/add?propertyId=${propertyId}`)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room Type
                </Button>
              </CardHeader>
              <CardContent>
                {roomTypes.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No room types found for this property.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roomTypes.map(roomType => (
                      <div 
                        key={roomType.id}
                        className="border p-4 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{roomType.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{roomType.description || 'No description'}</p>
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-full ${
                            roomType.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {roomType.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                          <div>
                            <span className="text-gray-600">Capacity:</span>
                            <span className="ml-2 font-medium">{roomType.capacity} guests</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Price:</span>
                            <span className="ml-2 font-medium">${roomType.basePrice}/night</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Available rooms:</span>
                            <span className="ml-2 font-medium">
                              {roomType.availableRooms} of {roomType.totalRooms}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigateToRoomTypeEdit(roomType.id)}
                          >
                            Edit Room Type
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saves through its own API, not with Save Changes */}
            <CustomDomainCard propertyId={propertyId} />

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/admin/properties')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
