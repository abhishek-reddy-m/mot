// direct-initialize-rates-js.js - A pure JavaScript implementation
const { PrismaClient } = require('@prisma/client');
const { format, addDays, addYears } = require('date-fns');

const prisma = new PrismaClient();

/**
 * Setup rates for all room types for the next 2 years
 */
async function setupFutureRates() {
  try {
    console.log('Starting to setup future rates for all room types...');
    let totalCreated = 0;

    // Get all active room types
    const roomTypes = await prisma.roomType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        basePrice: true,
        propertyId: true,
      },
    });

    if (roomTypes.length === 0) {
      console.log('No active room types found');
      return {
        success: false,
        message: 'No active room types found',
        created: 0,
      };
    }

    // Define date range for the next 2 years
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoYearsFromNow = addYears(today, 2);

    // Process each room type
    for (const roomType of roomTypes) {
      console.log(`Processing room type: ${roomType.name} (${roomType.id})`);
      
      // Get existing rates for this room type using raw query
      const existingRatesResult = await prisma.$queryRaw`
        SELECT date FROM room_type_rates 
        WHERE "roomTypeId" = ${roomType.id}
        AND date >= ${today}::date
        AND date <= ${twoYearsFromNow}::date
      `;
      
      // Convert result to array of dates
      const existingRates = Array.isArray(existingRatesResult) ? existingRatesResult : [];

      // Create a set of dates that already have rates
      const existingDates = new Set(
        existingRates.map((rate) => format(rate.date, 'yyyy-MM-dd'))
      );

      // Generate rates for dates that don't have them
      const ratesToCreate = [];
      let currentDate = new Date(today);

      while (currentDate <= twoYearsFromNow) {
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        
        if (!existingDates.has(formattedDate)) {
          ratesToCreate.push({
            roomTypeId: roomType.id,
            date: new Date(formattedDate),
            price: roomType.basePrice,
          });
        }
        
        currentDate = addDays(currentDate, 1);
      }

      // Batch create the missing rates
      if (ratesToCreate.length > 0) {
        // We'll batch insert in chunks to avoid memory issues
        const BATCH_SIZE = 100;
        for (let i = 0; i < ratesToCreate.length; i += BATCH_SIZE) {
          const batch = ratesToCreate.slice(i, i + BATCH_SIZE);
          
          // Use raw query to insert the rates
          for (const rate of batch) {
            await prisma.$executeRaw`
              INSERT INTO room_type_rates (id, "roomTypeId", date, price, "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), ${rate.roomTypeId}, ${rate.date}::date, ${rate.price}, NOW(), NOW())
              ON CONFLICT ("roomTypeId", date) DO NOTHING
            `;
          }
        }
        
        totalCreated += ratesToCreate.length;
        console.log(`Created ${ratesToCreate.length} rates for ${roomType.name}`);
      } else {
        console.log(`No new rates needed for ${roomType.name}`);
      }
    }

    return {
      success: true,
      message: `Successfully created ${totalCreated} rate records for ${roomTypes.length} room types`,
      created: totalCreated,
    };
  } catch (error) {
    console.error('Error setting up future rates:', error);
    return {
      success: false,
      message: `Failed to set up future rates: ${error.message || String(error)}`,
      created: 0,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
async function main() {
  try {
    console.log('Starting rate initialization...');
    const result = await setupFutureRates();
    
    if (result.success) {
      console.log('✅ Success:', result.message);
    } else {
      console.error('❌ Failed:', result.message);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

main();
