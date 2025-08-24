// check-room-type-rates.js
// This script will query the database to check if there are any room type rates
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoomTypeRates() {
  try {
    console.log('Checking room type rates in database...');
    
    // Get all room types
    const roomTypes = await prisma.roomType.findMany({
      select: {
        id: true,
        name: true,
        basePrice: true,
      }
    });
    
    console.log(`Found ${roomTypes.length} room types:`);
    for (const roomType of roomTypes) {
      console.log(`- ${roomType.name} (ID: ${roomType.id}, Base Price: $${roomType.basePrice})`);
    }
    
    // Check if the room_type_rates table exists
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'room_type_rates'
        );
      `;
      console.log('room_type_rates table exists:', tableExists[0].exists);
    } catch (error) {
      console.error('Error checking if table exists:', error);
    }
    
    // Attempt to query the room_type_rates table directly with SQL
    try {
      const ratesCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM room_type_rates;
      `;
      console.log('Total rates in database:', ratesCount[0].count);
      
      if (ratesCount[0].count > 0) {
        // Get some sample rates
        const sampleRates = await prisma.$queryRaw`
          SELECT "roomTypeId", date, price FROM room_type_rates
          ORDER BY date
          LIMIT 10;
        `;
        
        console.log('Sample rates:');
        for (const rate of sampleRates) {
          const roomType = roomTypes.find(rt => rt.id === rate.roomTypeId);
          const roomTypeName = roomType ? roomType.name : 'Unknown';
          console.log(`- ${new Date(rate.date).toISOString().split('T')[0]} for ${roomTypeName}: $${rate.price}`);
        }
      } else {
        console.log('No rates found in the database.');
      }
      
      // Check rates for each room type
      for (const roomType of roomTypes) {
        const roomTypeRatesCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM room_type_rates
          WHERE "roomTypeId" = ${roomType.id};
        `;
        console.log(`Rates for ${roomType.name}: ${roomTypeRatesCount[0].count}`);
      }
      
    } catch (error) {
      console.error('Error querying room_type_rates table:', error);
      console.log('This could indicate the table does not exist or has a different structure than expected.');
    }
    
    // Check the database schema for room_type_rates table
    try {
      const tableSchema = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'room_type_rates';
      `;
      
      console.log('Room type rates table schema:');
      for (const column of tableSchema) {
        console.log(`- ${column.column_name} (${column.data_type})`);
      }
    } catch (error) {
      console.error('Error checking table schema:', error);
    }
    
  } catch (error) {
    console.error('Error checking room type rates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoomTypeRates();
