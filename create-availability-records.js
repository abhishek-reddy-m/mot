const { PrismaClient } = require('@prisma/client');
const { safeQuery } = require('./src/lib/db-utils');
const prisma = new PrismaClient();

async function createMissingAvailabilityRecords() {
  try {
    console.log('=== Creating missing availability records for existing bookings ===');
    
    // Get all pending/confirmed bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      },
      include: {
        roomType: {
          select: { name: true, totalRooms: true, property: { select: { name: true } } }
        }
      }
    });
    
    console.log(`Found ${bookings.length} active bookings`);
    
    for (const booking of bookings) {
      console.log(`\nProcessing booking: ${booking.roomType.property.name} - ${booking.roomType.name}`);
      console.log(`Dates: ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}`);
      console.log(`Rooms: ${booking.rooms}, Status: ${booking.status}`);
      
      // Generate date range (excluding checkout date)
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      checkIn.setUTCHours(12, 0, 0, 0);
      checkOut.setUTCHours(12, 0, 0, 0);
      
      const dateRange = [];
      const currentDate = new Date(checkIn);
      
      while (currentDate < checkOut) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // For each date, ensure availability record exists and is accurate
      for (const date of dateRange) {
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const upsertQuery = `
            INSERT INTO room_availabilities ("roomTypeId", date, "totalRooms", "bookedRooms", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT ("roomTypeId", date) 
            DO UPDATE SET 
              "bookedRooms" = room_availabilities."bookedRooms" + $4,
              "updatedAt" = NOW()
            RETURNING "bookedRooms"
          `;
          
          const result = await safeQuery(upsertQuery, booking.roomTypeId, date, booking.roomType.totalRooms, booking.rooms);
          
          if (result && result.length > 0) {
            console.log(`  ✅ ${dateStr}: Set booked rooms to ${result[0].bookedRooms}`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing ${dateStr}:`, error.message);
        }
      }
    }
    
    console.log('\n=== Final availability status ===');
    const availability = await prisma.roomAvailability.findMany({
      include: {
        roomType: {
          select: { name: true, property: { select: { name: true } } }
        }
      },
      where: {
        date: {
          gte: new Date('2025-07-20'),
          lte: new Date('2025-07-25')
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
    console.error('Error creating availability records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingAvailabilityRecords();
