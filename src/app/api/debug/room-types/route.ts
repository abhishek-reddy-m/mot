import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Testing room types database connection...');
    
    // Test 1: Basic database connection
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection test:', connectionTest);
    
    // Test 2: Check if room_types table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'room_types'
      );
    `;
    console.log('Room types table exists:', tableExists);
    
    // Test 3: Get room types count
    const roomTypesCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM room_types;
    `;
    console.log('Room types count:', roomTypesCount);
    
    // Test 4: Get a few room types
    const roomTypes = await prisma.$queryRaw`
      SELECT 
        rt.id, 
        rt.name, 
        rt."propertyId", 
        rt.description, 
        rt.capacity, 
        rt."basePrice", 
        rt."totalRooms",
        rt."isActive"
      FROM room_types rt
      LIMIT 5
    `;
    console.log('Room types sample:', roomTypes);
    
    return NextResponse.json({
      success: true,
      connectionTest,
      tableExists,
      roomTypesCount,
      roomTypes: Array.isArray(roomTypes) ? roomTypes : []
    });
    
  } catch (error) {
    console.error('Room types test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}
