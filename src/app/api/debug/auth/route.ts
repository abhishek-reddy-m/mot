import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user || null,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      cookies: {
        sessionToken: request.cookies.get('next-auth.session-token')?.value ? 'present' : 'missing',
        secureSessionToken: request.cookies.get('__Secure-next-auth.session-token')?.value ? 'present' : 'missing',
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Auth check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
    }, { status: 500 });
  }
}
