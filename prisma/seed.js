const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Delete all existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.roomAvailability.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.roomTypePhoto.deleteMany({});
  await prisma.propertyPhoto.deleteMany({});
  await prisma.roomType.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('All existing data cleared.');
  
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
      name: "Oceanview Resort",
      description: "Luxury beachfront resort with stunning ocean views and private beach access.",
      address: "123 Coastal Highway",
      city: "Malibu",
      state: "CA",
      zipCode: "90265",
      phone: "+13105550123",
      email: "info@oceanviewresort.com",
      amenities: [
        "Pool",
        "Private Beach",
        "Spa",
        "Fitness Center",
        "Restaurant",
        "Free WiFi"
      ],
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
            publicId: "oceanview_main",
            isMain: true
          },
          {
            url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
            publicId: "oceanview_pool",
            isMain: false
          }
        ]
      },
      roomTypes: {
        create: [
          {
            name: "Ocean Suite",
            description: "Luxurious suite with direct ocean view, king bed, and private balcony.",
            capacity: 2,
            basePrice: 299.99,
            totalRooms: 10,
            amenities: [
              "Ocean View",
              "King Bed",
              "Private Balcony",
              "Mini Bar",
              "Free WiFi",
              "Air Conditioning"
            ],
            photos: {
              create: [
                {
                  url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
                  publicId: "ocean_suite_main",
                  isMain: true
                }
              ]
            }
          },
          {
            name: "Garden Room",
            description: "Comfortable room with garden view and two queen beds.",
            capacity: 4,
            basePrice: 199.99,
            totalRooms: 15,
            amenities: [
              "Garden View",
              "Queen Beds",
              "Mini Fridge",
              "Free WiFi",
              "Air Conditioning"
            ],
            photos: {
              create: [
                {
                  url: "https://images.unsplash.com/photo-1576675784201-0e142b423952",
                  publicId: "garden_room_main",
                  isMain: true
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Property 1 created:', property1.id);

  const property2 = await prisma.property.create({
    data: {
      name: "Mountain Lodge",
      description: "Cozy mountain retreat with stunning views and access to hiking trails.",
      address: "456 Alpine Road",
      city: "Aspen",
      state: "CO",
      zipCode: "81611",
      phone: "+19705550187",
      email: "stay@mountainlodge.com",
      amenities: [
        "Fireplace",
        "Hot Tub",
        "Hiking Trails",
        "Restaurant",
        "Free WiFi",
        "Ski Storage"
      ],
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1506974210756-8e1b8985d348",
            publicId: "lodge_main",
            isMain: true
          },
          {
            url: "https://images.unsplash.com/photo-1618767689160-da3fb810aab7",
            publicId: "lodge_interior",
            isMain: false
          }
        ]
      },
      roomTypes: {
        create: [
          {
            name: "Mountain View Suite",
            description: "Spacious suite with breathtaking mountain views, king bed, and fireplace.",
            capacity: 2,
            basePrice: 349.99,
            totalRooms: 8,
            amenities: [
              "Mountain View",
              "King Bed",
              "Fireplace",
              "Balcony",
              "Mini Bar",
              "Free WiFi"
            ],
            photos: {
              create: [
                {
                  url: "https://images.unsplash.com/photo-1615874959474-d609969a20ed",
                  publicId: "mountain_suite",
                  isMain: true
                }
              ]
            }
          },
          {
            name: "Family Cabin",
            description: "Rustic cabin with two bedrooms, perfect for families.",
            capacity: 6,
            basePrice: 449.99,
            totalRooms: 5,
            amenities: [
              "Two Bedrooms",
              "Kitchen",
              "Living Area",
              "Fireplace",
              "Porch",
              "Free WiFi"
            ],
            photos: {
              create: [
                {
                  url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
                  publicId: "family_cabin",
                  isMain: true
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Property 2 created:', property2.id);

  // Create room availability for the current month
  console.log('Creating room availability records...');
  
  // Get all room types
  const roomTypes = await prisma.roomType.findMany();
  
  // For each room type, create availability for the next 30 days
  const today = new Date();
  
  for (const roomType of roomTypes) {
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      // Make some dates have fewer available rooms to simulate bookings
      const bookedRooms = i % 7 === 0 ? 2 : (i % 5 === 0 ? 1 : 0);
      
      await prisma.roomAvailability.create({
        data: {
          roomTypeId: roomType.id,
          date: date,
          totalRooms: roomType.totalRooms,
          bookedRooms: bookedRooms
        }
      });
    }
  }

  console.log('Room availability created');
  
  // Create a few sample bookings
  const booking1 = await prisma.booking.create({
    data: {
      userId: customer.id,
      propertyId: property1.id,
      roomTypeId: (await prisma.roomType.findFirst({
        where: { propertyId: property1.id }
      })).id,
      checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8),
      guests: 2,
      rooms: 1,
      totalPrice: 899.97, // 3 nights × $299.99
      status: 'CONFIRMED'
    }
  });
  
  console.log('Sample booking created:', booking1.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
