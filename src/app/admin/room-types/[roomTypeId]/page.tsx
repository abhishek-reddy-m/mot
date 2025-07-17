'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Save, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';

type RoomTypeFormData = {
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
  totalRooms: number;
  availableRooms?: number;
  amenities: string[];
  isActive: boolean;
};

export default function EditRoomTypePage({ params }: { params: Promise<{ roomTypeId: string }> }) {
  const router = useRouter();
  // Use React.use() to unwrap the params promise
  const { roomTypeId } = use(params);
  
  const [formData, setFormData] = useState<RoomTypeFormData>({
    name: '',
    description: '',
    capacity: 2,
    basePrice: 0,
    totalRooms: 0,
    availableRooms: 0,
    amenities: [],
    isActive: true
  });

  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');

  useEffect(() => {
    const fetchRoomType = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/room-types/${roomTypeId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch room type');
        }
        
        const roomType = await response.json();
        
        setFormData({
          name: roomType.name || '',
          description: roomType.description || '',
          capacity: roomType.capacity || 2,
          basePrice: roomType.basePrice || 0,
          totalRooms: roomType.totalRooms || 0,
          availableRooms: roomType.availableRooms || 0,
          amenities: roomType.amenities || [],
          isActive: roomType.isActive
        });
        
        setPropertyId(roomType.propertyId);
      } catch (err) {
        console.error('Error fetching room type:', err);
        setError('Failed to load room type. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomType();
  }, [roomTypeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'totalRooms') {
      // Calculate available rooms when total rooms change
      const currentBooked = formData.totalRooms - formData.availableRooms!;
      const newTotal = parseInt(value);
      
      // Don't allow reducing below booked rooms
      if (newTotal < currentBooked) {
        return;
      }
      
      const newAvailable = newTotal - currentBooked;
      
      setFormData({
        ...formData,
        totalRooms: newTotal,
        availableRooms: newAvailable
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'capacity' || name === 'basePrice' 
          ? parseFloat(value) 
          : name === 'isActive' 
            ? value === 'true' 
            : value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch(`/api/admin/room-types/${roomTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room type');
      }
      
      setSuccess(true);
      
      // Redirect back to properties page after 2 seconds
      setTimeout(() => {
        router.push(`/admin/properties/${propertyId}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error updating room type:', err);
      setError(err.message || 'Failed to update room type. Please try again.');
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
  
  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');
      
      const response = await fetch(`/api/admin/room-types/${roomTypeId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete room type');
      }
      
      // Show success message
      setSuccess(true);
      setShowDeleteConfirm(false);
      
      // Redirect back to property page after 2 seconds
      setTimeout(() => {
        router.push(`/admin/properties/${propertyId}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error deleting room type:', err);
      setError(err.message || 'Failed to delete room type. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Room management is now handled via totalRooms and availableRooms fields

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
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/properties/${propertyId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
          <h1 className="text-2xl font-bold">Edit Room Type</h1>
        </div>
      </div>
      
      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
          {deleting ? "Room type deleted successfully!" : "Room type updated successfully!"}
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
                  <label className="block text-sm font-medium mb-1">Room Type Name*</label>
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
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Capacity (guests)*</label>
                    <Input 
                      name="capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Price per Night ($)*</label>
                    <Input 
                      name="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Rooms*</label>
                    <Input 
                      name="totalRooms"
                      type="number"
                      min={formData.totalRooms - (formData.availableRooms || 0)}
                      value={formData.totalRooms}
                      onChange={handleChange}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Available: {formData.availableRooms || 0} / {formData.totalRooms}
                    </div>
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
                <CardTitle>Room Counts</CardTitle>
                <div className="text-sm text-gray-500">
                  Total: {formData.totalRooms} | Available: {formData.availableRooms}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Rooms
                      </label>
                      <Input
                        type="number"
                        name="totalRooms"
                        value={formData.totalRooms}
                        onChange={handleChange}
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Rooms
                      </label>
                      <Input
                        type="number"
                        name="availableRooms"
                        value={formData.availableRooms}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value <= formData.totalRooms) {
                            setFormData({
                              ...formData,
                              availableRooms: value
                            });
                          }
                        }}
                        min={0}
                        max={formData.totalRooms}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Cannot exceed total rooms
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between space-x-4">
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Room Type
              </Button>
              
              <div className="flex space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/admin/properties/${propertyId}`)}
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || deleting}>
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
            </div>
            
            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Delete Room Type</h3>
                  <p className="mb-6">
                    Are you sure you want to delete this room type? This action cannot be undone.
                    If the room type has any bookings, it will be marked as inactive instead of being deleted.
                  </p>
                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}
