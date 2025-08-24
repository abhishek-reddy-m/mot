const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking room type rates...');

  // Query for all room types
  const roomTypes = await prisma.roomType.findMany({
    select: {
      id: true,
      name: true,
      basePrice: true,
    }
  });

  console.log(`Found ${roomTypes.length} room types`);
  
  // For each room type, check for custom rates on 8/28/2025
  for (const roomType of roomTypes) {
    console.log(`\nRoom Type: ${roomType.name} (${roomType.id})`);
    console.log(`Base Price: ${roomType.basePrice}`);
    
    // Check for custom rates on 8/28/2025
    const customRates = await prisma.$queryRaw`
      SELECT 
        date, 
        price,
        TO_CHAR(date, 'YYYY-MM-DD') as date_str 
      FROM room_type_rates 
      WHERE "roomTypeId" = ${roomType.id}
      AND TO_CHAR(date, 'YYYY-MM-DD') = '2025-08-28'
    `;
    
    console.log(`Custom rates for 8/28/2025: ${customRates.length}`);
    console.log(customRates);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
