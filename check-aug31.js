const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAug31Specifically() {
  try {
    console.log('Checking for August 31st rate...');
    
    // Get the room type ID first
    const roomType = await prisma.roomType.findFirst();
    console.log(`Room type ID: ${roomType.id}`);
    
    // Check if there's a rate for exactly 2025-08-31
    const directQuery = await prisma.$queryRaw`
      SELECT 
        id, 
        "roomTypeId", 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        date,
        price
      FROM "room_type_rates" 
      WHERE "roomTypeId" = ${roomType.id}
      AND "date" = '2025-08-31'::date
    `;
    
    console.log('Direct query for 2025-08-31:', directQuery);
    
    // Check the date range query that the API uses
    const rangeQuery = await prisma.$queryRaw`
      SELECT 
        id, 
        "roomTypeId", 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        date,
        price
      FROM "room_type_rates" 
      WHERE "roomTypeId" = ${roomType.id}
      AND "date" >= '2025-08-01'::date
      AND "date" <= '2025-08-31'::date
      AND TO_CHAR(date, 'YYYY-MM-DD') IN ('2025-08-29', '2025-08-30', '2025-08-31')
      ORDER BY "date" ASC
    `;
    
    console.log('Range query for Aug 29-31:', rangeQuery);
    
    // Check what dates exist around Aug 31st
    const nearbyDates = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        price
      FROM "room_type_rates" 
      WHERE "roomTypeId" = ${roomType.id}
      AND "date" >= '2025-08-28'::date
      AND "date" <= '2025-09-02'::date
      ORDER BY "date" ASC
    `;
    
    console.log('Dates around Aug 31st:', nearbyDates);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAug31Specifically();
