import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Test endpoint that just returns the session info
export async function GET() {
  try {
    console.log('Test API: Starting auth check');
    const session = await auth();
    console.log('Test API: Session result:', session ? JSON.stringify({
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    }) : 'No session found');
    
    return NextResponse.json({
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role
        }
      } : null
    });
  } catch (error) {
    console.error('Test API: Error checking auth:', error);
    return NextResponse.json(
      { error: 'Error checking authentication' },
      { status: 500 }
    );
  }
}
