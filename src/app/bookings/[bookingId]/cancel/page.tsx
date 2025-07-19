'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';

type BookingDetails = {
  id: string;
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
  };
  roomType: {
    name: string;
  };
};

export default function CancelBookingPage({ params }: { params: { bookingId: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bookings/${params.bookingId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        
        const data = await response.json();
        setBooking(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchBookingDetails();
    }
  }, [params.bookingId, router, status]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Function to handle booking cancellation
  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      const response = await fetch(`/api/bookings/${params.bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancellationReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      router.push('/dashboard?cancelled=true');
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setError(err.message || 'Failed to cancel booking');
      setCancelling(false);
    }
  };

  // Check if booking is within 24 hours
  const isWithin24Hours = () => {
    if (!booking) return false;
    
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    const timeDiff = checkInDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff < 24;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
              <p className="mb-6">{error}</p>
              <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  const checkInDate = formatDate(booking.checkIn);
  const checkOutDate = formatDate(booking.checkOut);
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const within24Hours = isWithin24Hours();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Cancel Booking</h1>
        <p className="text-gray-600 mt-2">
          Please review the booking details before cancellation
        </p>
      </div>

      <div className="space-y-8">
        {/* Booking Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Booking #{booking.id.slice(0, 8)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{booking.property.name}</h3>
                <p className="text-gray-600 mb-4">
                  {booking.property.city}, {booking.property.state}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{booking.roomType.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div>{checkInDate} to {checkOutDate}</div>
                      <div className="text-sm text-gray-500">{nights} night{nights !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t md:border-t-0 md:border-l border-gray-200 md:pl-6 pt-4 md:pt-0">
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">Status</span>
                  <Badge className="ml-2">{booking.status}</Badge>
                </div>
                
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">Guests</span>
                  <p className="font-medium">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                </div>
                
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">Rooms</span>
                  <p className="font-medium">{booking.rooms} room{booking.rooms !== 1 ? 's' : ''}</p>
                </div>
                
                <div>
                  <span className="text-gray-600 text-sm">Total Price</span>
                  <p className="text-xl font-bold">${Number(booking.totalPrice).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Request</CardTitle>
            <CardDescription>
              Please provide a reason for cancellation (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {within24Hours ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <h3 className="font-medium text-yellow-700">Cannot cancel this booking</h3>
                    <p className="text-yellow-600 text-sm">
                      This booking cannot be cancelled as it is within 24 hours of check-in.
                      Please contact the property directly for assistance.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label htmlFor="reason" className="block mb-2 text-sm font-medium text-gray-700">
                    Reason for cancellation
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide a reason (optional)"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <h3 className="font-medium text-red-700">Cancellation Policy</h3>
                      <p className="text-red-600 text-sm">
                        This action cannot be undone. Your booking will be cancelled and any rooms
                        will be released back into inventory.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={cancelling}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Booking'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
