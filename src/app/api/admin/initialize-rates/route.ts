import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setupFutureRates, setupFutureRatesForRoomType } from '@/lib/setup-future-rates';

// POST /api/admin/initialize-rates
export async function POST(request: NextRequest) {
  try {
    console.log('Initialize rates API called');
    const session = await auth();
    
    console.log('Auth session:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    } : 'No session');
    
    // Check authentication
    if (!session?.user) {
      console.log('Authentication failed: No user in session');
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      console.log(`Authentication failed: User role ${session.user.role} is not ADMIN`);
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.log('No request body or invalid JSON');
      body = {};
    }
    
    const { roomTypeId } = body;
    console.log(`Initialize rates for ${roomTypeId ? `room type: ${roomTypeId}` : 'all room types'}`);
    
    let result;
    
    // If roomTypeId is provided, initialize rates for that specific room type
    if (roomTypeId) {
      result = await setupFutureRatesForRoomType(roomTypeId);
    } else {
      // Otherwise, initialize rates for all room types
      result = await setupFutureRates();
    }
    
    console.log('Initialize rates result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error initializing rates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize rates',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
