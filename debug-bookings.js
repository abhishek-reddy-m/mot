const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('=== Checking all bookings ===');
    const bookings = await prisma.booking.findMany({
      include: {
        roomType: {
          select: {
            name: true,
            totalRooms: true
          }
        },
        property: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${bookings.length} total bookings:`);
    bookings.forEach((booking, index) => {
      console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Property: ${booking.property.name}`);
      console.log(`   Room Type: ${booking.roomType.name} (Total: ${booking.roomType.totalRooms})`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Dates: ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}`);
      console.log(`   Rooms: ${booking.rooms}`);
      console.log(`   Guests: ${booking.guests}`);
      console.log(`   Created: ${booking.createdAt.toISOString()}`);
    });

    // Check specific date range for Garden Room
    console.log('\n=== Checking Garden Room availability for 2025-07-21 to 2025-07-22 ===');
    const gardenRoomBookings = await prisma.booking.findMany({
      where: {
        roomType: {
          name: 'Garden Room'
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          {
            checkIn: { lte: new Date('2025-07-22T12:00:00Z') },
            checkOut: { gte: new Date('2025-07-21T12:00:00Z') }
          }
        ]
      },
      include: {
        roomType: {
          select: {
            name: true,
            totalRooms: true
          }
        }
      }
    });

    console.log(`Found ${gardenRoomBookings.length} Garden Room bookings overlapping with 2025-07-21 to 2025-07-22:`);
    let totalRoomsBooked = 0;
    gardenRoomBookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.status} - ${booking.rooms} rooms from ${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}`);
      totalRoomsBooked += booking.rooms;
    });

    const gardenRoom = gardenRoomBookings[0]?.roomType;
    if (gardenRoom) {
      console.log(`\nGarden Room Summary:`);
      console.log(`   Total Rooms: ${gardenRoom.totalRooms}`);
      console.log(`   Booked Rooms: ${totalRoomsBooked}`);
      console.log(`   Available Rooms: ${gardenRoom.totalRooms - totalRoomsBooked}`);
    }

    // Check room availability records
    console.log('\n=== Checking RoomAvailability records ===');
    const availabilityRecords = await prisma.roomAvailability.findMany({
      where: {
        date: {
          gte: new Date('2025-07-21T00:00:00Z'),
          lt: new Date('2025-07-23T00:00:00Z')
        }
      },
      include: {
        roomType: {
          select: {
            name: true,
            totalRooms: true
          }
        }
      },
      orderBy: [
        { roomType: { name: 'asc' } },
        { date: 'asc' }
      ]
    });

    console.log(`Found ${availabilityRecords.length} availability records for 2025-07-21 to 2025-07-22:`);
    availabilityRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.roomType.name} on ${record.date.toISOString().split('T')[0]}: ${record.bookedRooms}/${record.totalRooms} booked`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
