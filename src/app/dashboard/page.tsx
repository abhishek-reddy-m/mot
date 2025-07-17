'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Star, Eye, User, Building2, DollarSign, AlertTriangle } from 'lucide-react';

type Booking = {
  id: string;
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  status: string;
  property: {
    name: string;
    city: string;
    state: string;
    photos: Array<{
      url: string;
    }>;
  };
  roomType: {
    name: string;
    capacity: number;
  };
};

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (status !== 'authenticated') return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/bookings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [status]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'CHECKED_IN': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_OUT': return 'bg-gray-100 text-gray-800';
      case 'NO_SHOW': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate nights between dates
  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 p-4 rounded-lg flex items-center text-red-800 mb-6">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-gray-600">Welcome back, {session?.user?.name || 'Guest'}</p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-3xl">{bookings.length}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Building2 className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming Stays</CardDescription>
              <CardTitle className="text-3xl">
                {bookings.filter(booking => 
                  ['PENDING', 'CONFIRMED'].includes(booking.status.toUpperCase())).length}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Calendar className="h-8 w-8 text-green-500" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Spent</CardDescription>
              <CardTitle className="text-3xl">
                ${bookings.reduce((sum, booking) => sum + Number(booking.totalPrice), 0).toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
        </div>
        
        {/* Bookings List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
          
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg mb-4">You don&apos;t have any bookings yet</p>
                <Button onClick={() => router.push('/properties')}>
                  Browse Properties
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const nights = calculateNights(booking.checkIn, booking.checkOut);
                const mainPhoto = booking.property.photos?.[0]?.url || '/placeholder-motel.jpg';
                
                return (
                  <Card key={booking.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-1/4 h-48 md:h-auto">
                        <img 
                          src={mainPhoto} 
                          alt={booking.property.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{booking.property.name}</h3>
                            <div className="flex items-center text-sm text-gray-500 mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{booking.property.city}, {booking.property.state}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 md:mt-0">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Room Type:</span>
                            <div className="font-medium">{booking.roomType.name}</div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Dates:</span>
                            <div className="font-medium">
                              {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                            </div>
                            <div className="text-gray-500 text-xs">{nights} night{nights !== 1 ? 's' : ''}</div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Guests:</span>
                            <div className="font-medium">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</div>
                            <div className="text-gray-500 text-xs">{booking.rooms} room{booking.rooms !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="text-xl font-bold text-blue-600">
                            ${Number(booking.totalPrice).toFixed(2)}
                          </div>
                          
                          <Button variant="outline" size="sm" onClick={() => router.push(`/bookings/${booking.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
