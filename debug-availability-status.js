const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAvailabilityStatus() {
  try {
    console.log('=== Current Room Availability Records ===');
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
    
    console.log('\n=== Recent Bookings ===');
    const bookings = await prisma.booking.findMany({
      include: {
        roomType: {
          select: { name: true, property: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    bookings.forEach(booking => {
      console.log(`${booking.roomType.property.name} - ${booking.roomType.name} - ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}: ${booking.rooms} rooms (${booking.status}) - Created: ${booking.createdAt.toISOString()}`);
    });
    
    console.log('\n=== Checking for Missing Availability Records ===');
    // Check if there are bookings without corresponding availability records
    const bookingDates = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      },
      select: {
        propertyId: true,
        roomTypeId: true,
        checkIn: true,
        checkOut: true,
        rooms: true
      }
    });
    
    for (const booking of bookingDates) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const availRecord = await prisma.roomAvailability.findFirst({
          where: {
            roomTypeId: booking.roomTypeId,
            date: new Date(dateStr)
          }
        });
        
        if (!availRecord) {
          console.log(`❌ Missing availability record for RoomType ${booking.roomTypeId}, Date ${dateStr}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking availability status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailabilityStatus();
