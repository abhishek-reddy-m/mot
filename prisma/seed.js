const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@motelbooking.com' },
    update: {},
    create: {
      email: 'admin@motelbooking.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin);

  // Create a test customer user
  const customerPassword = await bcrypt.hash('customer123', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1987654321',
      role: 'CUSTOMER',
    },
  });

  console.log('Customer user created:', customer);
  
  // Create sample properties with room types
  const property1 = await prisma.property.create({
    data: {
      name: 'Oceanview Resort',
      description: 'Luxury beachfront resort with stunning ocean views and private beach access.',
      address: '123 Coastal Highway',
      city: 'Malibu',
      state: 'CA',
      zipCode: '90265',
      phone: '+13105550123',
      email: 'info@oceanviewresort.com',
      amenities: ['Pool', 'Private Beach', 'Spa', 'Fitness Center', 'Restaurant', 'Free WiFi'],
      photos: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
            publicId: 'oceanview_main',
            isMain: true
          },
          {
            url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4',
            publicId: 'oceanview_pool',
            isMain: false
          }
        ]
      },
      roomTypes: {
        create: [
          {
            name: 'Ocean Suite',
            description: 'Luxurious suite with direct ocean view, king bed, and private balcony.',
            capacity: 2,
            basePrice: 299.99,
            totalRooms: 10,
            availableRooms: 10,
            amenities: ['Ocean View', 'King Bed', 'Private Balcony', 'Mini Bar', 'Free WiFi', 'Air Conditioning'],
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
                  publicId: 'ocean_suite_main',
                  isMain: true
                }
              ]
            }
          },
          {
            name: 'Garden Room',
            description: 'Comfortable room with garden view and two queen beds.',
            capacity: 4,
            basePrice: 199.99,
            totalRooms: 15,
            availableRooms: 15,
            amenities: ['Garden View', 'Queen Beds', 'Mini Fridge', 'Free WiFi', 'Air Conditioning'],
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1576675784201-0e142b423952',
                  publicId: 'garden_room_main',
                  isMain: true
                }
              ]
            }
          }
        ]
      }
    }
  });
  
  console.log('Property created:', property1.name);
  
  const property2 = await prisma.property.create({
    data: {
      name: 'Mountain Lodge',
      description: 'Cozy mountain retreat with panoramic views and hiking trails nearby.',
      address: '456 Mountain Pass Road',
      city: 'Aspen',
      state: 'CO',
      zipCode: '81611',
      phone: '+19705551234',
      email: 'stay@mountainlodge.com',
      amenities: ['Fireplace', 'Hot Tub', 'Hiking Trails', 'Restaurant', 'Free WiFi', 'Ski Storage'],
      photos: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131',
            publicId: 'mountain_main',
            isMain: true
          },
          {
            url: 'https://images.unsplash.com/photo-1586375300773-8384e3e4916f',
            publicId: 'mountain_interior',
            isMain: false
          }
        ]
      },
      roomTypes: {
        create: [
          {
            name: 'Mountain View Suite',
            description: 'Spacious suite with fireplace and breathtaking mountain views.',
            capacity: 2,
            basePrice: 259.99,
            totalRooms: 8,
            availableRooms: 8,
            amenities: ['Mountain View', 'Fireplace', 'King Bed', 'Soaking Tub', 'Free WiFi'],
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a',
                  publicId: 'mountain_suite_main',
                  isMain: true
                }
              ]
            }
          },
          {
            name: 'Family Cabin',
            description: 'Rustic cabin with two bedrooms, perfect for families.',
            capacity: 6,
            basePrice: 329.99,
            totalRooms: 5,
            availableRooms: 5,
            amenities: ['Two Bedrooms', 'Fireplace', 'Full Kitchen', 'Private Porch', 'Air Conditioning'],
            photos: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1567636788276-40a47795ba4d',
                  publicId: 'family_cabin_main',
                  isMain: true
                }
              ]
            }
          }
        ]
      }
    }
  });
  
  console.log('Property created:', property2.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
