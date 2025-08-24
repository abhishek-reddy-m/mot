// seed-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting to seed database with sample data...');
    
    // Create a sample property
    const property = await prisma.property.create({
      data: {
        name: 'Casa Camino Resort',
        description: 'A beautiful resort with scenic views',
        address: '123 Main Street',
        city: 'Coastal Town',
        state: 'California',
        zipCode: '90210',
        phone: '555-123-4567',
        email: 'info@casacamino.com',
        amenities: ['Pool', 'Spa', 'WiFi', 'Restaurant', 'Parking'],
        isActive: true,
      }
    });

    console.log(`Created property: ${property.name} with ID: ${property.id}`);

    // Create room types for the property
    const roomTypes = await Promise.all([
      prisma.roomType.create({
        data: {
          propertyId: property.id,
          name: 'Standard Room',
          description: 'Comfortable room with basic amenities',
          capacity: 2,
          basePrice: 100.00,
          totalRooms: 10,
          amenities: ['TV', 'AC', 'Mini Fridge', 'Coffee Maker'],
          isActive: true,
        }
      }),
      prisma.roomType.create({
        data: {
          propertyId: property.id,
          name: 'Deluxe Room',
          description: 'Spacious room with premium amenities',
          capacity: 3,
          basePrice: 150.00,
          totalRooms: 8,
          amenities: ['TV', 'AC', 'Mini Bar', 'Coffee Maker', 'Balcony'],
          isActive: true,
        }
      }),
      prisma.roomType.create({
        data: {
          propertyId: property.id,
          name: 'Suite',
          description: 'Luxury suite with separate living area',
          capacity: 4,
          basePrice: 250.00,
          totalRooms: 5,
          amenities: ['TV', 'AC', 'Mini Bar', 'Coffee Maker', 'Balcony', 'Jacuzzi'],
          isActive: true,
        }
      })
    ]);

    console.log(`Created ${roomTypes.length} room types`);
    
    // Create sample rates for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get number of days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Create rates for each day of the current month for each room type
    for (const roomType of roomTypes) {
      const rates = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        
        // Higher rates for weekends (Friday, Saturday)
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
        
        const basePrice = parseFloat(roomType.basePrice);
        const price = isWeekend ? basePrice * 1.25 : basePrice;
        
        rates.push({
          roomTypeId: roomType.id,
          date,
          price
        });
      }
      
      await prisma.roomTypeRate.createMany({
        data: rates
      });
      
      console.log(`Created ${rates.length} rates for room type: ${roomType.name}`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
