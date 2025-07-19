const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration for room availability...');
  
  // Get all active room types
  const roomTypes = await prisma.roomType.findMany({
    where: { isActive: true }
  });
  
  console.log(`Found ${roomTypes.length} room types to create availability records for.`);
  
  // Generate availability records for the next 365 days for each room type
  const startDate = new Date();
  startDate.setHours(12, 0, 0, 0); // Set to noon UTC for consistency
  
  for (const roomType of roomTypes) {
    console.log(`Processing room type: ${roomType.name} (ID: ${roomType.id})`);
    console.log(`Total rooms: ${roomType.totalRooms}`);
    
    // Get existing bookings for this room type to calculate initial booked rooms
    const bookings = await prisma.booking.findMany({
      where: {
        roomTypeId: roomType.id,
        status: { notIn: ['CANCELLED'] },
        checkOut: { gt: startDate } // Only future or current bookings
      }
    });
    
    console.log(`Found ${bookings.length} active bookings for this room type`);
    
    // Create a record for each day in the next year
    const availabilityRecords = [];
    
    for (let i = 0; i < 365; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // Calculate booked rooms for this date
      let bookedRooms = 0;
      for (const booking of bookings) {
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        
        // Check if current date falls within the booking range
        if (currentDate >= bookingStart && currentDate < bookingEnd) {
          bookedRooms += booking.rooms;
        }
      }
      
      // Don't create records where bookedRooms is 0 to save db space
      // We'll handle the non-existence as "all available" in our code
      if (bookedRooms > 0) {
        availabilityRecords.push({
          roomTypeId: roomType.id,
          date: currentDate,
          totalRooms: roomType.totalRooms,
          bookedRooms,
          updatedAt: new Date()
        });
      }
    }
    
    if (availabilityRecords.length > 0) {
      console.log(`Creating ${availabilityRecords.length} availability records`);
      
      // Use createMany for bulk insertion
      await prisma.roomAvailability.createMany({
        data: availabilityRecords,
        skipDuplicates: true
      });
      
      console.log('Records created successfully');
    } else {
      console.log('No bookings found for this room type, skipping availability creation');
    }
  }
  
  console.log('Data migration completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error in data migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
