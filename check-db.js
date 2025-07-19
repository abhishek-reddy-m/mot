const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log('Admin user:', adminUser);

    const allRoomTypes = await prisma.roomType.findMany();
    console.log('Room types count:', allRoomTypes.length);
    if (allRoomTypes.length > 0) {
      console.log('Sample room type:', allRoomTypes[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
