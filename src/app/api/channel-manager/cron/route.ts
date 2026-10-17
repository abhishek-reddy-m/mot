import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { pullReservations } from '@/lib/channel-manager/reservations';
import { errorMessage, pushAri } from '@/lib/channel-manager/sync';

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

/**
 * POST /api/channel-manager/cron
 * Run every few minutes from a scheduler (e.g. a Render cron job):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/channel-manager/cron
 * Pulls OTA reservations for every active connection and, with ?full=1,
 * re-pushes the full availability/rate window as a reconciliation.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const full = request.nextUrl.searchParams.get('full') === '1';
  const connections = await prisma.channelConnection.findMany({
    where: { status: { in: ['ACTIVE', 'ERROR'] } },
    select: { id: true },
  });

  const results = [];
  for (const { id } of connections) {
    const result: Record<string, unknown> = { connectionId: id };
    try {
      result.reservations = (await pullReservations(id)).length;
    } catch (error) {
      result.reservationError = errorMessage(error);
    }
    if (full) {
      try {
        result.ari = (await pushAri(id)).message;
      } catch (error) {
        result.ariError = errorMessage(error);
      }
    }
    results.push(result);
  }
  return NextResponse.json({ connections: results.length, results });
}
