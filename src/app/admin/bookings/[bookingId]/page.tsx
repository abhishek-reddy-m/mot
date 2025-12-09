'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, Building2, DollarSign, Clock, Loader2, CreditCard, Eye, EyeOff } from 'lucide-react';

type PaymentDetails = {
  cardNumber: string;
  maskedCardNumber: string;
  cardLast4: string;
  cardBrand: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvv: string;
  billingName: string;
  billingZip: string;
};

type BookingDetailsType = {
  id: string;
  userId: string;
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  status: string;
  notes?: string;
  // Payment details
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  billingName?: string;
  billingZip?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  property: {
    name: string;
    city: string;
    state: string;
  };
  roomType: {
    name: string;
    capacity: number;
  };
  statusHistory: {
    id: string;
    status: string;
    notes?: string;
    createdAt: string;
  }[];
};

export default function AdminBookingDetailsPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState<string>('');
  
  const [booking, setBooking] = useState<BookingDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  
  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showFullCard, setShowFullCard] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Unwrap params Promise
  useEffect(() => {
    params.then((resolvedParams) => {
      setBookingId(resolvedParams.bookingId);
    });
  }, [params]);

  // Fetch booking details
  useEffect(() => {
    if (!bookingId) return;
    
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/bookings/${bookingId}`);
        
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

    fetchBookingDetails();
  }, [bookingId]);

  // Fetch payment details
  const fetchPaymentDetails = async () => {
    if (!bookingId || paymentDetails) return; // Don't fetch if already loaded
    
    try {
      setLoadingPayment(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/payment`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }
      
      const data = await response.json();
      setPaymentDetails(data);
    } catch (err) {
      console.error('Error fetching payment details:', err);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Format dates
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'checked_out':
        return 'bg-purple-100 text-purple-800';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status update
  const updateBookingStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      // Refresh booking data
      const updatedBookingResponse = await fetch(`/api/admin/bookings/${bookingId}`);
      if (updatedBookingResponse.ok) {
        const updatedData = await updatedBookingResponse.json();
        setBooking(updatedData);
        setStatusNotes('');
      }
      
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-700">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const checkInDate = formatDate(booking.checkIn);
  const checkOutDate = formatDate(booking.checkOut);
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const isBookingActive = ['PENDING', 'CONFIRMED'].includes(booking.status);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.id.slice(0, 8)}</h1>
            <div className="flex items-center mt-1">
              <Badge className={`${getStatusColor(booking.status)} mr-2`}>
                {booking.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-500">
                Created on {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main booking details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Property</p>
                    <div className="flex items-center mt-1">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="font-medium">{booking.property.name}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.property.city}, {booking.property.state}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Room Type</p>
                    <p className="font-medium">{booking.roomType.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.rooms} room{booking.rooms > 1 ? 's' : ''}, {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Price</p>
                    <div className="flex items-center mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                      <p className="font-medium">${Number(booking.totalPrice).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Check-in / Check-out</p>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{checkInDate}</p>
                        <p className="text-sm text-gray-500 mt-1">to {checkOutDate} ({nights} night{nights > 1 ? 's' : ''})</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Guest</p>
                    <div className="flex items-center mt-1">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{booking.user.firstName} {booking.user.lastName}</p>
                        <p className="text-sm text-gray-500 mt-1">{booking.user.email}</p>
                        {booking.user.phone && (
                          <p className="text-sm text-gray-500">{booking.user.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {booking.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="mt-1">{booking.notes}</p>
                </div>
              )}
              
              {/* Payment Information */}
              {booking.cardLast4 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Information
                    </p>
                    {!paymentDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchPaymentDetails}
                        disabled={loadingPayment}
                      >
                        {loadingPayment ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Eye className="h-4 w-4 mr-1" />
                        )}
                        View Full Details
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Card:</span>{' '}
                      {paymentDetails ? (
                        <span className="font-medium font-mono">
                          {showFullCard ? paymentDetails.cardNumber : paymentDetails.maskedCardNumber}
                          <button
                            onClick={() => setShowFullCard(!showFullCard)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            {showFullCard ? <EyeOff className="h-3 w-3 inline" /> : <Eye className="h-3 w-3 inline" />}
                          </button>
                        </span>
                      ) : (
                        <span className="font-medium">{booking.cardBrand} •••• {booking.cardLast4}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Expires:</span>{' '}
                      <span className="font-medium">
                        {paymentDetails 
                          ? `${paymentDetails.cardExpMonth?.toString().padStart(2, '0')}/${paymentDetails.cardExpYear}`
                          : `${booking.cardExpMonth?.toString().padStart(2, '0')}/${booking.cardExpYear}`
                        }
                      </span>
                    </div>
                    {paymentDetails && (
                      <div>
                        <span className="text-gray-500">CVV:</span>{' '}
                        <span className="font-medium font-mono">
                          {showCvv ? paymentDetails.cardCvv : '•••'}
                          <button
                            onClick={() => setShowCvv(!showCvv)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            {showCvv ? <EyeOff className="h-3 w-3 inline" /> : <Eye className="h-3 w-3 inline" />}
                          </button>
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium">{paymentDetails?.billingName || booking.billingName}</span>
                    </div>
                    {(paymentDetails?.billingZip || booking.billingZip) && (
                      <div>
                        <span className="text-gray-500">Billing Zip:</span>{' '}
                        <span className="font-medium">{paymentDetails?.billingZip || booking.billingZip}</span>
                      </div>
                    )}
                  </div>
                  
                  {paymentDetails && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>⚠️ Security Notice:</strong> Full card details are displayed for no-show charge purposes only. 
                      Do not share or store these details outside this system.
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    {paymentDetails 
                      ? 'Use these details to process no-show charges if needed.'
                      : 'Card not charged - payment details held for reservation guarantee. Click "View Full Details" to see complete card info for no-show charges.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-200" />
                <div className="space-y-6 relative">
                  {booking.statusHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-4">
                      <div className="flex-none mt-0.5">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-700" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg border p-4">
                          <p className="font-medium">
                            Status changed to{' '}
                            <Badge className={getStatusColor(history.status)}>
                              {history.status.replace('_', ' ')}
                            </Badge>
                          </p>
                          <div className="mt-1 text-sm text-gray-500">
                            {new Date(history.createdAt).toLocaleString()}
                          </div>
                          {history.notes && (
                            <p className="mt-2 text-sm">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status update form */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about this status change"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>
              
              {/* Status update buttons */}
              <div className="space-y-2">
                {booking.status !== 'CONFIRMED' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    disabled={updating || booking.status === 'CANCELLED'}
                    onClick={() => updateBookingStatus('CONFIRMED')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Booking
                  </Button>
                )}
                
                {booking.status === 'CONFIRMED' && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={updating}
                    onClick={() => updateBookingStatus('CHECKED_IN')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Check-In Guest
                  </Button>
                )}
                
                {booking.status === 'CHECKED_IN' && (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    disabled={updating}
                    onClick={() => updateBookingStatus('CHECKED_OUT')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Check-Out Guest
                  </Button>
                )}
                
                {isBookingActive && (
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    disabled={updating}
                    onClick={() => updateBookingStatus('CANCELLED')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cancel Booking
                  </Button>
                )}
                
                {booking.status === 'CANCELLED' && isBookingActive && (
                  <Button 
                    className="w-full" 
                    disabled={updating}
                    onClick={() => updateBookingStatus('CONFIRMED')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Restore Booking
                  </Button>
                )}
                
                {booking.status === 'CONFIRMED' && (
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700" 
                    disabled={updating}
                    onClick={() => updateBookingStatus('NO_SHOW')}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Mark as No-Show
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
