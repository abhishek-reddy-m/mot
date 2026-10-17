import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { activateConnection, serializeConnection, setConnectionPaused } from '@/lib/channel-manager/connections';
import { ChannelApiError } from '@/lib/channel-manager/types';

// POST /api/admin/channels/[connectionId]/status - { action: 'activate' | 'pause' }
export async function POST(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const { action } = await request.json();
    if (action === 'activate') {
      const result = await activateConnection(connectionId);
      return NextResponse.json({ ...result, connection: serializeConnection(result.connection) });
    }
    if (action === 'pause') {
      return NextResponse.json({ connection: serializeConnection(await setConnectionPaused(connectionId, true)) });
    }
    throw new ChannelApiError('action must be "activate" or "pause"');
  } catch (err) {
    return errorResponse(err, 'Error changing channel connection status');
  }
}
