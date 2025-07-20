const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAvailabilityForTesting() {
  try {
    console.log('=== Resetting availability records for testing ===');
    
    const roomTypeId = 'cmda5lpos0007u3vs3tilffhj'; // Garden Room ID
    
    // Delete all manually created records for Garden Room July 21
    const deleted = await prisma.roomAvailability.deleteMany({
      where: {
        roomTypeId,
        date: new Date('2025-07-21T12:00:00Z')
      }
    });
    
    console.log(`Deleted ${deleted.count} manually created records for July 21`);
    
    // Check remaining records
    const records = await prisma.roomAvailability.findMany({
      where: {
        roomTypeId,
        date: {
          gte: new Date('2025-07-20T00:00:00Z'),
          lt: new Date('2025-07-25T00:00:00Z')
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
      orderBy: {
        date: 'asc'
      }
    });
    
    console.log('Remaining availability records:');
    records.forEach((record, index) => {
      const available = record.totalRooms - record.bookedRooms;
      console.log(`   ${index + 1}. ${record.roomType.name} on ${record.date.toISOString().split('T')[0]}: ${record.bookedRooms}/${record.totalRooms} booked, ${available} available`);
    });
    
    console.log('\nNow when a new booking is created, the updateRoomAvailability function should create proper records automatically.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAvailabilityForTesting();
