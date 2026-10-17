import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { serializeConnection, testConnection } from '@/lib/channel-manager/connections';

// POST /api/admin/channels/[connectionId]/test - verify credentials with the OTA
export async function POST(_request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const result = await testConnection(connectionId);
    return NextResponse.json({ ...result, connection: serializeConnection(result.connection) });
  } catch (err) {
    return errorResponse(err, 'Error testing channel connection');
  }
}
