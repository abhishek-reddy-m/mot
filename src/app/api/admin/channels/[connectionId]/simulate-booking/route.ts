import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { simulateReservation } from '@/lib/channel-manager/reservations';

// POST /api/admin/channels/[connectionId]/simulate-booking - sandbox test reservation
export async function POST(_request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    return NextResponse.json({ results: await simulateReservation(connectionId) });
  } catch (err) {
    return errorResponse(err, 'Error simulating OTA booking');
  }
}
