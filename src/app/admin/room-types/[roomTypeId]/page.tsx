'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Save, Loader2, ArrowLeft, Plus, Trash2, Upload, Star, Image as ImageIcon, DoorOpen, Edit2, X } from 'lucide-react';

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

type RoomTypePhoto = {
  id: string;
  url: string;
  publicId: string;
  isMain: boolean;
  createdAt: string;
};

type Room = {
  id: string;
  roomNumber: string;
  floor?: string;
  status: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER';
  isOutOfOrder: boolean;
  outOfOrderReason?: string;
  notes?: string;
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
  const [photos, setPhotos] = useState<RoomTypePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Room management state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', floor: '', notes: '' });
  const [savingRoom, setSavingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

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
        setPhotos(roomType.photos || []);
        
        // Fetch rooms for this room type
        fetchRooms(roomType.propertyId);
      } catch (err) {
        console.error('Error fetching room type:', err);
        setError('Failed to load room type. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomType();
  }, [roomTypeId]);

  // Fetch rooms for this room type
  const fetchRooms = async (propId?: string) => {
    try {
      setLoadingRooms(true);
      const pid = propId || propertyId;
      if (!pid) return;
      
      const response = await fetch(`/api/admin/rooms?propertyId=${pid}&roomTypeId=${roomTypeId}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Add a new room
  const handleAddRoom = async () => {
    if (!newRoom.roomNumber.trim()) return;
    
    try {
      setSavingRoom(true);
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          roomTypeId,
          roomNumber: newRoom.roomNumber.trim(),
          floor: newRoom.floor.trim() || undefined,
          notes: newRoom.notes.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add room');
      }
      
      const room = await response.json();
      setRooms([...rooms, room]);
      setNewRoom({ roomNumber: '', floor: '', notes: '' });
      setShowAddRoomModal(false);
      
      // Update total rooms count
      setFormData(prev => ({
        ...prev,
        totalRooms: prev.totalRooms + 1,
        availableRooms: (prev.availableRooms || 0) + 1,
      }));
    } catch (err) {
      console.error('Error adding room:', err);
      setError(err instanceof Error ? err.message : 'Failed to add room');
    } finally {
      setSavingRoom(false);
    }
  };

  // Update room
  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    
    try {
      setSavingRoom(true);
      const response = await fetch(`/api/admin/rooms/${editingRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: editingRoom.roomNumber,
          floor: editingRoom.floor || undefined,
          notes: editingRoom.notes || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update room');
      }
      
      const updatedRoom = await response.json();
      setRooms(rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r));
      setEditingRoom(null);
    } catch (err) {
      console.error('Error updating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setSavingRoom(false);
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      setDeletingRoomId(roomId);
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete room');
      }
      
      setRooms(rooms.filter(r => r.id !== roomId));
      
      // Update total rooms count
      setFormData(prev => ({
        ...prev,
        totalRooms: Math.max(0, prev.totalRooms - 1),
        availableRooms: Math.max(0, (prev.availableRooms || 0) - 1),
      }));
    } catch (err) {
      console.error('Error deleting room:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setDeletingRoomId(null);
    }
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'CLEAN': return 'bg-green-100 text-green-700';
      case 'DIRTY': return 'bg-red-100 text-red-700';
      case 'INSPECTED': return 'bg-blue-100 text-blue-700';
      case 'OUT_OF_ORDER': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      
    } catch (err: Error | unknown) {
      console.error('Error updating room type:', err);
      setError(err instanceof Error ? err.message : 'Failed to update room type. Please try again.');
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
      const response = await fetch(`/api/admin/room-types/${roomTypeId}/photos`, {
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
      const response = await fetch(`/api/admin/room-types/${roomTypeId}/photos?photoId=${photoId}`, {
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
      const response = await fetch(`/api/admin/room-types/${roomTypeId}/photos`, {
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
      
    } catch (err: Error | unknown) {
      console.error('Error deleting room type:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete room type. Please try again.');
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

            {/* Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Room Type Photos
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
                          alt="Room type photo"
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

            {/* Individual Rooms Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <DoorOpen className="h-5 w-5 mr-2" />
                  Individual Rooms
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddRoomModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Room
                </Button>
              </CardHeader>
              <CardContent>
                {loadingRooms ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : rooms.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className={`relative p-3 rounded-lg border-2 ${
                          room.isOutOfOrder ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                        } hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">{room.roomNumber}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRoom(room)}
                              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoom(room.id)}
                              disabled={deletingRoomId === room.id}
                              className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              {deletingRoomId === room.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        {room.floor && (
                          <div className="text-xs text-gray-500 mb-1">Floor: {room.floor}</div>
                        )}
                        <Badge className={`text-xs ${getRoomStatusColor(room.status)}`}>
                          {room.status.replace('_', ' ')}
                        </Badge>
                        {room.isOutOfOrder && (
                          <div className="mt-1 text-xs text-red-600 truncate" title={room.outOfOrderReason}>
                            OOO: {room.outOfOrderReason || 'No reason'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <DoorOpen className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No rooms added yet</p>
                    <p className="text-sm">Click "Add Room" to create individual rooms with room numbers</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Room Modal */}
            {showAddRoomModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Add New Room</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRoomModal(false);
                        setNewRoom({ roomNumber: '', floor: '', notes: '' });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Room Number *
                      </label>
                      <Input
                        value={newRoom.roomNumber}
                        onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                        placeholder="e.g., 101, A1, Suite 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor
                      </label>
                      <Input
                        value={newRoom.floor}
                        onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                        placeholder="e.g., 1, Ground, Basement"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Textarea
                        value={newRoom.notes}
                        onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                        placeholder="Any additional notes about this room"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddRoomModal(false);
                        setNewRoom({ roomNumber: '', floor: '', notes: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddRoom}
                      disabled={!newRoom.roomNumber.trim() || savingRoom}
                    >
                      {savingRoom ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Room
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Room Modal */}
            {editingRoom && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Edit Room</h3>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Room Number *
                      </label>
                      <Input
                        value={editingRoom.roomNumber}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                        placeholder="e.g., 101, A1, Suite 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor
                      </label>
                      <Input
                        value={editingRoom.floor || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                        placeholder="e.g., 1, Ground, Basement"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Textarea
                        value={editingRoom.notes || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                        placeholder="Any additional notes about this room"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingRoom(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUpdateRoom}
                      disabled={!editingRoom.roomNumber.trim() || savingRoom}
                    >
                      {savingRoom ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
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
