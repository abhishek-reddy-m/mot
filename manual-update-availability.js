const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manuallyUpdateAvailability() {
  try {
    console.log('=== Manually updating room availability records ===');
    
    const roomTypeId = 'cmda5lpos0007u3vs3tilffhj'; // Garden Room ID
    const date1 = new Date('2025-07-21T12:00:00Z');
    
    // Update the record for 2025-07-21 to show 3 booked rooms (matching the actual booking)
    const updated = await prisma.roomAvailability.updateMany({
      where: {
        roomTypeId,
        date: date1
      },
      data: {
        bookedRooms: 3
      }
    });
    
    console.log(`Updated ${updated.count} records for 2025-07-21`);
    
    // Check the result
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
    
    console.log('Updated availability records:');
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

manuallyUpdateAvailability();
