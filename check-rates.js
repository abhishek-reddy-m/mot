// check-rates.js
// Check if rates were successfully created
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRates() {
  try {
    // Get count of all rates
    const totalRatesCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM room_type_rates
    `;
    
    console.log('Total rates count:', totalRatesCount[0].count);
    
    // Get a sample of rates for validation
    const sampleRates = await prisma.$queryRaw`
      SELECT * FROM room_type_rates 
      ORDER BY date 
      LIMIT 5
    `;
    
    console.log('Sample rates:');
    sampleRates.forEach(rate => {
      console.log(`  ${rate.date.toISOString().split('T')[0]}: $${rate.price}`);
    });
    
    // Get count by room type
    const roomTypeRatesCount = await prisma.$queryRaw`
      SELECT r.name, COUNT(rtr.id) as count 
      FROM room_type_rates rtr
      JOIN room_types r ON rtr."roomTypeId" = r.id
      GROUP BY r.name
    `;
    
    console.log('Rates count by room type:');
    roomTypeRatesCount.forEach(item => {
      console.log(`  ${item.name}: ${item.count} rates`);
    });
    
  } catch (error) {
    console.error('Error checking rates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRates();
