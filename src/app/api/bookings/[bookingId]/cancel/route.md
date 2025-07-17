# API endpoint for booking cancellation

This endpoint handles:
1. Cancellation of bookings
2. Releasing room inventory when bookings are canceled

## How to implement:

Create a PUT route for `/api/bookings/[bookingId]/cancel` that:
- Verifies the user is authorized to cancel the booking
- Updates the booking status to CANCELLED
- Returns the previously booked rooms to inventory by incrementing the roomType's availableRooms field
- Adds a status history entry

Example implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth();
    const bookingId = params.bookingId;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        roomType: true
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if user is authorized (either admin or booking owner)
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = booking.userId === session.user.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this booking' },
        { status: 403 }
      );
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      );
    }
    
    if (['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that has already been processed' },
        { status: 400 }
      );
    }
    
    // Get request body for optional cancellation reason
    const body = await request.json().catch(() => ({}));
    const cancellationReason = body.reason || 'Booking cancelled by user';
    
    // Use a transaction to update booking status and return rooms to inventory
    const updatedBooking = await prisma.$transaction(async (prisma) => {
      // 1. Update room inventory by incrementing the availableRooms count
      await prisma.roomType.update({
        where: { id: booking.roomTypeId },
        data: {
          availableRooms: {
            increment: booking.rooms
          }
        }
      });
      
      // 2. Update the booking status
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          statusHistory: {
            create: {
              status: 'CANCELLED',
              notes: cancellationReason
            }
          }
        },
        include: {
          roomType: {
            select: { name: true }
          },
          property: {
            select: { name: true }
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      return updated;
    });
    
    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```
