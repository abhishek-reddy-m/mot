import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET dashboard statistics
export async function GET() {
  try {
    const session = await auth();
    
    console.log('Dashboard API: Auth session received:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    } : 'No session');
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }
    
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Unauthorized - Role ${session.user?.role} is not ADMIN` },
        { status: 401 }
      );
    }

    // Get current date and first day of the month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count total properties
    const totalProperties = await prisma.property.count();

    // Count total bookings this month
    const totalBookingsThisMonth = await prisma.booking.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      }
    });

    // Count total users
    const totalUsers = await prisma.user.count({
      where: {
        role: 'CUSTOMER'
      }
    });

    // Calculate total revenue this month
    const bookingsThisMonth = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      },
      select: {
        totalPrice: true
      }
    });

    const totalRevenue = bookingsThisMonth.reduce((sum, booking) => 
      sum + Number(booking.totalPrice), 0);
    
    // Calculate occupancy rate
    const currentDate = new Date();
    const occupancyData = await prisma.booking.findMany({
      where: {
        checkIn: { lte: currentDate },
        checkOut: { gte: currentDate },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN']
        }
      },
      include: {
        roomType: true
      }
    });

    // Get total rooms across all properties - using a simpler approach for the calculation
    const allRoomTypes = await prisma.roomType.findMany();
    
    // TypeScript workaround for Prisma field
    interface RoomTypeWithTotal {
      totalRooms: number;
    }
    
    const totalRooms = allRoomTypes.reduce((sum: number, room) => {
      // Using type assertion since we know the field exists in the database schema
      const typedRoom = room as unknown as RoomTypeWithTotal;
      return sum + (typedRoom.totalRooms || 0);
    }, 0);
    
    const occupiedRooms = occupancyData.reduce((sum: number, booking) => sum + booking.rooms, 0);
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    // Set a default average rating since there's no review model
    const avgRating = 4.7;

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        property: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      totalProperties,
      totalBookings: totalBookingsThisMonth,
      totalUsers,
      totalRevenue,
      occupancyRate,
      avgRating,
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        guest: `${booking.user.firstName} ${booking.user.lastName}`,
        property: booking.property.name,
        checkIn: booking.checkIn.toISOString().split('T')[0],
        amount: Number(booking.totalPrice)
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
