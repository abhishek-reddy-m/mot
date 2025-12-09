'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, DollarSign, AlertCircle, Loader2, X, Plus, Clock } from 'lucide-react';

type Booking = {
  id: string;
  property: {
    name: string;
    address: string;
    city: string;
    photos?: Array<{ url: string }>;
  };
  roomType: {
    name: string;
    basePrice: number;
    photos?: Array<{ url: string }>;
  };
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  totalPrice: number;
  status: string;
  canCancel: boolean;
  canModify: boolean;
  canModifyCheckIn: boolean;
  canModifyCheckOut: boolean;
  cancellationDeadline: string;
};

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModifying, setIsModifying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [newCheckInDate, setNewCheckInDate] = useState('');
  const [isChangingDates, setIsChangingDates] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchBooking();
    }
  }, [status, params.bookingId]);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bookings/${params.bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }
      
      const data = await response.json();
      console.log('Booking data:', data);
      console.log('canModify:', data.canModify, 'canCancel:', data.canCancel, 'canModifyCheckIn:', data.canModifyCheckIn, 'canModifyCheckOut:', data.canModifyCheckOut);
      setBooking(data);
    } catch (err) {
      setError('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyDates = async () => {
    if (!booking) return;
    
    const currentCheckInStr = booking.checkIn.split('T')[0];
    const currentCheckOutStr = booking.checkOut.split('T')[0];
    
    const checkInChanged = newCheckInDate && newCheckInDate !== currentCheckInStr;
    const checkOutChanged = newCheckOutDate && newCheckOutDate !== currentCheckOutStr;
    
    if (!checkInChanged && !checkOutChanged) {
      setError('Please modify at least one date to update');
      return;
    }

    const checkInToUse = checkInChanged ? new Date(newCheckInDate) : new Date(booking.checkIn);
    const checkOutToUse = checkOutChanged ? new Date(newCheckOutDate) : new Date(booking.checkOut);

    if (checkInToUse >= checkOutToUse) {
      setError('Check-in date must be before check-out date');
      return;
    }

    setIsModifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/bookings/${params.bookingId}/modify-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          newCheckIn: checkInChanged ? newCheckInDate : undefined,
          newCheckOut: checkOutChanged ? newCheckOutDate : undefined
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to modify dates');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      setSuccess('Booking dates updated successfully!');
      setNewCheckInDate('');
      setNewCheckOutDate('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to modify dates');
    } finally {
      setIsModifying(false);
    }
  };

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/bookings/${params.bookingId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setSuccess('Booking cancelled successfully');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Booking not found</h1>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Booking Details */}
        <Card className="mb-6 overflow-hidden">
          {/* Room/Property Photo */}
          {(booking.roomType.photos?.[0]?.url || booking.property.photos?.[0]?.url) && (
            <div className="relative h-48 w-full">
              <img
                src={booking.roomType.photos?.[0]?.url || booking.property.photos?.[0]?.url}
                alt={booking.roomType.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{booking.property.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <MapPin className="h-4 w-4" />
                  {booking.property.address}, {booking.property.city}
                </CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {booking.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Guests & Rooms</p>
                  <p className="font-medium">{booking.guests} guests, {booking.rooms} room(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Price</p>
                  <p className="font-medium text-lg">${booking.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Room Type</p>
              <p className="text-gray-900">{booking.roomType.name}</p>
              <p className="text-sm text-gray-500">Base rate: ${booking.roomType.basePrice}/night</p>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy Notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">24-Hour Cancellation Policy</h3>
                <p className="text-sm text-blue-800">
                  You can cancel or modify your booking up to 24 hours before 3 PM on your check-in date.
                  {booking.canCancel && (
                    <span className="block mt-1 font-medium">
                      Cancellation deadline: {new Date(booking.cancellationDeadline).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modify Booking Dates */}
        {booking.canModify && (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Modify Booking Dates
              </CardTitle>
              <CardDescription>
                {booking.canModifyCheckIn 
                  ? 'Change your check-in and/or check-out dates'
                  : 'Check-in date cannot be modified (within 24-hour window). You can still modify the check-out date.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="newCheckIn" className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <Input
                    id="newCheckIn"
                    type="date"
                    value={newCheckInDate || booking.checkIn.split('T')[0]}
                    onChange={(e) => setNewCheckInDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={!booking.canModifyCheckIn}
                    className={!booking.canModifyCheckIn ? 'bg-gray-100 cursor-not-allowed' : ''}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {new Date(booking.checkIn).toLocaleDateString()}
                    {!booking.canModifyCheckIn && <span className="text-orange-600 ml-1">(locked)</span>}
                  </p>
                </div>
                <div>
                  <label htmlFor="newCheckOut" className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <Input
                    id="newCheckOut"
                    type="date"
                    value={newCheckOutDate || booking.checkOut.split('T')[0]}
                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                    min={new Date(new Date(newCheckInDate || booking.checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleModifyDates}
                disabled={isModifying}
                className="w-full flex items-center justify-center gap-2"
              >
                {isModifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Dates...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Update Booking Dates
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cancel Booking */}
        {booking.canCancel && (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <X className="h-5 w-5" />
                Cancel Booking
              </CardTitle>
              <CardDescription>
                Cancel your booking before the deadline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCancelConfirm ? (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel This Booking
                </Button>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-800 font-medium mb-4">
                    Are you sure you want to cancel this booking? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={isCancelling}
                    >
                      Keep Booking
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleCancelBooking}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Cancelling...
                        </>
                      ) : (
                        'Yes, Cancel Booking'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!booking.canCancel && (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Cancellation No Longer Available</h3>
                  <p className="text-sm text-yellow-800">
                    The 24-hour cancellation window has passed. Please contact the property directly if you need to make changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
