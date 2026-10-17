import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { pullReservations } from '@/lib/channel-manager/reservations';
import { pushAri } from '@/lib/channel-manager/sync';
import { ChannelApiError } from '@/lib/channel-manager/types';

// POST /api/admin/channels/[connectionId]/sync - { type: 'ari' | 'reservations' | 'all' }
export async function POST(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const { type = 'all' } = await request.json().catch(() => ({}));
    if (!['ari', 'reservations', 'all'].includes(type)) {
      throw new ChannelApiError('type must be ari, reservations or all');
    }
    const ari = type === 'reservations' ? null : await pushAri(connectionId);
    const reservations = type === 'ari' ? null : await pullReservations(connectionId);
    return NextResponse.json({ ari, reservations });
  } catch (err) {
    return errorResponse(err, 'Error syncing channel');
  }
}
