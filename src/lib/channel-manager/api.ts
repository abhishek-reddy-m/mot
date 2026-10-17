import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { ChannelApiError } from './types';

type AdminCheck = { session: Session; error?: undefined } | { session?: undefined; error: NextResponse };

/** Channel management is admin-only, like the rest of the admin APIs */
export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

/** ChannelApiError messages are meant for admins; anything else is a 500 */
export function errorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ChannelApiError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
