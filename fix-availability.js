const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAvailabilityRecords() {
  try {
    console.log('=== Fixing all availability records ===');
    
    const roomTypeId = 'cmda5lpos0007u3vs3tilffhj'; // Garden Room ID
    
    // Delete ALL records for Garden Room between July 21-22
    const deleted = await prisma.roomAvailability.deleteMany({
      where: {
        roomTypeId,
        date: {
          gte: new Date('2025-07-21T00:00:00Z'),
          lt: new Date('2025-07-23T00:00:00Z')
        }
      }
    });
    
    console.log(`Deleted ${deleted.count} records for Garden Room July 21-22`);
    
    // Create correct records
    const record1 = await prisma.roomAvailability.create({
      data: {
        roomTypeId,
        date: new Date('2025-07-21T12:00:00Z'),
        totalRooms: 15,
        bookedRooms: 3 // The actual booking is for 3 rooms
      }
    });
    
    console.log('Created record for July 21:', record1.id);
    
    // Check final state
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
    
    console.log('Final availability records:');
    records.forEach((record, index) => {
      const available = record.totalRooms - record.bookedRooms;
      console.log(`   ${index + 1}. ${record.roomType.name} on ${record.date.toISOString().split('T')[0]}: ${record.bookedRooms}/${record.totalRooms} booked, ${available} available`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAvailabilityRecords();
