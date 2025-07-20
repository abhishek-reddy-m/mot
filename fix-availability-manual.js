const { PrismaClient } = require('@prisma/client');
const { updateRoomAvailability } = require('./src/lib/room-availability.ts');
const prisma = new PrismaClient();

async function fixMissingAvailability() {
  try {
    console.log('=== Fixing missing availability records ===');
    
    // Get all pending/confirmed bookings that might not have availability records
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      },
      include: {
        roomType: {
          select: { name: true, property: { select: { name: true } } }
        }
      }
    });
    
    console.log(`Found ${bookings.length} active bookings`);
    
    for (const booking of bookings) {
      console.log(`\nProcessing booking: ${booking.roomType.property.name} - ${booking.roomType.name}`);
      console.log(`Dates: ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}`);
      console.log(`Rooms: ${booking.rooms}, Status: ${booking.status}`);
      
      // Update room availability for this booking
      await updateRoomAvailability(
        booking.roomTypeId,
        booking.checkIn,
        booking.checkOut,
        booking.rooms,
        false // Not a cancellation
      );
    }
    
    console.log('\n=== Checking availability after fix ===');
    const availability = await prisma.roomAvailability.findMany({
      include: {
        roomType: {
          select: { name: true, property: { select: { name: true } } }
        }
      },
      orderBy: [
        { roomTypeId: 'asc' },
        { date: 'asc' }
      ]
    });
    
    availability.forEach(record => {
      console.log(`${record.roomType.property.name} - ${record.roomType.name} - ${record.date.toISOString().split('T')[0]}: ${record.totalRooms - record.bookedRooms}/${record.totalRooms} available (${record.bookedRooms} booked)`);
    });
    
  } catch (error) {
    console.error('Error fixing availability:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingAvailability();
