const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    console.log('=== Cleaning up duplicate availability records ===');
    
    const roomTypeId = 'cmda5lpos0007u3vs3tilffhj'; // Garden Room ID
    const date1 = new Date('2025-07-21T12:00:00Z');
    
    // Delete all records for this room type and date
    const deleted = await prisma.roomAvailability.deleteMany({
      where: {
        roomTypeId,
        date: date1
      }
    });
    
    console.log(`Deleted ${deleted.count} records for 2025-07-21`);
    
    // Create a single correct record
    const newRecord = await prisma.roomAvailability.create({
      data: {
        roomTypeId,
        date: date1,
        totalRooms: 15,
        bookedRooms: 3
      }
    });
    
    console.log('Created new record:', newRecord);
    
    // Check all records
    const records = await prisma.roomAvailability.findMany({
      where: {
        roomTypeId,
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

cleanupDuplicates();
