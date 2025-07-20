const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaModels() {
  try {
    console.log('Available Prisma models:');
    console.log('prisma.roomAvailability exists:', !!prisma.roomAvailability);
    console.log('prisma.roomType exists:', !!prisma.roomType);
    console.log('prisma.booking exists:', !!prisma.booking);
    
    // Test if we can access the room availability model
    try {
      const count = await prisma.roomAvailability.count();
      console.log('roomAvailability count:', count);
    } catch (error) {
      console.log('Error accessing roomAvailability:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaModels();
