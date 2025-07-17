'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Star, Calendar, Users, Coffee, Wifi, Car, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  amenities: string[];
  isActive: boolean;
  availableRooms: number;
  totalRooms: number;
  photos: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
};

type Property = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string | null;
  amenities: string[];
  isActive: boolean;
  photos: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
  roomTypes: RoomType[];
};

type BookingDetails = {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomTypeId: string;
  rooms: number;
};

export default function PropertyDetailsPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Use React.use() to unwrap the params promise
  const { propertyId } = use(params);
  
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    guests: 1,
    roomTypeId: '',
    rooms: 1
  });
  
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/properties/${propertyId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }
        const data = await response.json();
        setProperty(data);
        
        // If there are room types, select the first one by default
        if (data.roomTypes && data.roomTypes.length > 0) {
          setSelectedRoomType(data.roomTypes[0]);
          setBookingDetails(prev => ({
            ...prev,
            roomTypeId: data.roomTypes[0].id
          }));
        }
      } catch (err) {
        setError('Error loading property. Please try again.');
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const handleBookingDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({
      ...prev,
      [name]: name === 'guests' || name === 'rooms' ? parseInt(value) : value
    }));
  };

  const handleRoomTypeChange = (roomTypeId: string) => {
    const roomType = property?.roomTypes.find(rt => rt.id === roomTypeId);
    if (roomType) {
      setSelectedRoomType(roomType);
      setBookingDetails(prev => ({
        ...prev,
        roomTypeId: roomType.id
      }));
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedRoomType) return 0;
    
    const checkIn = new Date(bookingDetails.checkIn);
    const checkOut = new Date(bookingDetails.checkOut);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
    
    return selectedRoomType.basePrice * nights * bookingDetails.rooms;
  };

  const handleBookNow = async () => {
    try {
      setIsBooking(true);
      setBookingError('');
      
      // Check if user is logged in
      const authResponse = await fetch('/api/auth/session');
      const authData = await authResponse.json();
      
      if (!authData.user) {
        // Save booking details to session storage and redirect to login
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          propertyId: propertyId,
          ...bookingDetails
        }));
        
        router.push('/login?redirect=/properties/' + propertyId);
        return;
      }
      
      // User is logged in, proceed with booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: propertyId,
          roomTypeId: bookingDetails.roomTypeId,
          checkIn: bookingDetails.checkIn,
          checkOut: bookingDetails.checkOut,
          guests: bookingDetails.guests,
          rooms: bookingDetails.rooms,
          totalPrice: calculateTotalPrice()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }
      
      setBookingSuccess(true);
      
      // Redirect to bookings page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err: Error | unknown) {
      console.error('Error creating booking:', err);
      setBookingError(err instanceof Error ? err.message : 'An error occurred during booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-red-600 mb-2">{error || 'Property not found'}</h3>
            <Button onClick={() => router.push('/properties')}>Back to Properties</Button>
          </div>
        </div>
      </div>
    );
  }

  const mainPhoto = property.photos.find(p => p.isMain)?.url || property.photos[0]?.url;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Property Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {property.address}, {property.city}, {property.state} {property.zipCode}
                </span>
              </div>
            </div>
            <div className="flex items-center mt-2 lg:mt-0">
              <div className="flex items-center bg-blue-50 px-3 py-1 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <span className="ml-1 font-semibold text-gray-800">4.8</span>
                <span className="ml-1 text-gray-500">(42 reviews)</span>
              </div>
            </div>
          </div>
          
          {/* Main Photo */}
          <div className="aspect-[16/9] w-full overflow-hidden rounded-lg shadow-md">
            {mainPhoto ? (
              <img 
                src={mainPhoto}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
        </div>

        {/* Property Description & Amenities */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">About this property</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <p className="text-gray-700 mb-6">{property.description || 'No description available.'}</p>
            
            <h3 className="font-semibold text-lg mb-3">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.amenities.map((amenity, i) => (
                <div key={i} className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  <span>{amenity}</span>
                </div>
              ))}
              {property.amenities.length === 0 && (
                <span className="text-gray-500">No amenities listed</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Room Types */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
          
          {property.roomTypes.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">No rooms available at this property.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {property.roomTypes.map(roomType => {
                const roomPhoto = roomType.photos.find(p => p.isMain)?.url || 
                                 roomType.photos[0]?.url || 
                                 mainPhoto;
                const isAvailable = (roomType.availableRooms > 0) && roomType.isActive;
                
                return (
                  <Card 
                    key={roomType.id}
                    className={`overflow-hidden hover:shadow-md transition-shadow ${
                      selectedRoomType?.id === roomType.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => isAvailable && handleRoomTypeChange(roomType.id)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      {roomPhoto ? (
                        <img
                          src={roomPhoto}
                          alt={roomType.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No image available</span>
                        </div>
                      )}
                      
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <Badge variant="destructive" className="text-lg py-1 px-3">
                            Not Available
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{roomType.name}</CardTitle>
                        <div className="text-xl font-bold text-blue-600">${roomType.basePrice}<span className="text-sm font-normal text-gray-500">/night</span></div>
                      </div>
                      <CardDescription>
                        Up to {roomType.capacity} guests
                      </CardDescription>
                      <div className="mt-1 text-sm text-muted-foreground flex flex-col space-y-1">
                        <div className="flex items-center">
                          <span className={`font-medium ${roomType.availableRooms > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {roomType.availableRooms} {roomType.availableRooms === 1 ? 'room' : 'rooms'} available
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {roomType.description || 'Comfortable accommodation with standard amenities.'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {roomType.amenities.map((amenity, i) => (
                          <Badge key={i} variant="outline" className="bg-blue-50">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <Button 
                          className="w-full"
                          disabled={!isAvailable}
                          onClick={() => {
                            setSelectedRoomType(roomType);
                            setBookingDetails(prev => ({
                              ...prev,
                              roomTypeId: roomType.id
                            }));
                            setShowBookingForm(true);
                          }}
                        >
                          {isAvailable ? 'Select Room' : 'Not Available'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Booking Form */}
        {showBookingForm && selectedRoomType && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Book Your Stay</h2>
            
            {bookingSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-green-800 mb-2">Booking Successful!</h3>
                <p className="text-green-700 mb-4">Your booking has been confirmed. Redirecting to your dashboard...</p>
              </div>
            ) : (
              <>
                {bookingError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                    <p className="text-red-700">{bookingError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-in Date</label>
                    <Input 
                      type="date"
                      name="checkIn"
                      value={bookingDetails.checkIn}
                      onChange={handleBookingDetailsChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-out Date</label>
                    <Input 
                      type="date"
                      name="checkOut"
                      value={bookingDetails.checkOut}
                      onChange={handleBookingDetailsChange}
                      min={bookingDetails.checkIn}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Guests</label>
                    <select
                      name="guests"
                      value={bookingDetails.guests}
                      onChange={handleBookingDetailsChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: selectedRoomType.capacity }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} guest{num !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Rooms</label>
                    <select
                      name="rooms"
                      value={bookingDetails.rooms}
                      onChange={handleBookingDetailsChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: Math.min(5, selectedRoomType.availableRooms) }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} room{num !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Selected Room:</span>
                    <span>{selectedRoomType.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Price per night:</span>
                    <span>${selectedRoomType.basePrice}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total Price:</span>
                    <span className="text-xl font-bold text-blue-600">${calculateTotalPrice()}</span>
                  </div>
                  
                  <Button
                    className="w-full mt-4"
                    disabled={isBooking}
                    onClick={handleBookNow}
                  >
                    {isBooking ? 'Processing...' : 'Book Now'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
