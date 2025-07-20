const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdateRoomAvailability() {
  try {
    console.log('=== Testing updateRoomAvailability function ===');
    
    // Import the function
    const { updateRoomAvailability } = await import('./src/lib/room-availability.ts');
    
    const roomTypeId = 'cmda5lpos0007u3vs3tilffhj'; // Garden Room ID from bookings
    const checkIn = new Date('2025-07-21T12:00:00Z');
    const checkOut = new Date('2025-07-22T12:00:00Z');
    const roomCount = 1; // Test with 1 room
    
    console.log('Before update - checking current availability records:');
    const beforeRecords = await prisma.roomAvailability.findMany({
      where: {
        roomTypeId,
        date: {
          gte: checkIn,
          lt: checkOut
        }
      }
    });
    console.log('Before records:', beforeRecords);
    
    console.log(`\nCalling updateRoomAvailability with:`);
    console.log(`  roomTypeId: ${roomTypeId}`);
    console.log(`  checkIn: ${checkIn.toISOString()}`);
    console.log(`  checkOut: ${checkOut.toISOString()}`);
    console.log(`  roomCount: ${roomCount}`);
    console.log(`  isCancel: false`);
    
    await updateRoomAvailability(roomTypeId, checkIn, checkOut, roomCount, false);
    
    console.log('\nAfter update - checking availability records:');
    const afterRecords = await prisma.roomAvailability.findMany({
      where: {
        roomTypeId,
        date: {
          gte: checkIn,
          lt: checkOut
        }
      }
    });
    console.log('After records:', afterRecords);
    
  } catch (error) {
    console.error('Error testing updateRoomAvailability:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdateRoomAvailability();
