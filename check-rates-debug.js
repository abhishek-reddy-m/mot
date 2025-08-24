const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRatesDetailed() {
  try {
    // Get the room type ID
    const roomType = await prisma.roomType.findFirst();
    if (!roomType) {
      console.log('No room type found');
      return;
    }
    
    console.log(`Checking rates for room type: ${roomType.name} (${roomType.id})`);
    console.log(`Base price: $${roomType.basePrice}`);
    
    // Check rates for August 2025
    const rates = await prisma.roomTypeRate.findMany({
      where: {
        roomTypeId: roomType.id,
        date: {
          gte: new Date('2025-08-01'),
          lte: new Date('2025-08-31')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\nFound ${rates.length} rates for August 2025:`);
    
    if (rates.length === 0) {
      console.log('No rates found! This is why the calendar shows base prices.');
      console.log('You need to run the rate initialization script.');
    } else {
      rates.forEach(rate => {
        const dateStr = rate.date.toISOString().split('T')[0];
        console.log(`${dateStr}: $${rate.price}`);
      });
      
      // Check specifically for our test dates
      console.log('\nSpecific test dates:');
      const testDates = ['2025-08-27', '2025-08-28'];
      testDates.forEach(dateStr => {
        const rate = rates.find(r => r.date.toISOString().split('T')[0] === dateStr);
        if (rate) {
          console.log(`${dateStr}: $${rate.price} (CUSTOM RATE)`);
        } else {
          console.log(`${dateStr}: $${roomType.basePrice} (BASE PRICE - no custom rate)`);
        }
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRatesDetailed();
