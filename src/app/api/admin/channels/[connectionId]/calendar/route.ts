import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { getChannelCalendar } from '@/lib/channel-manager/rates';
import { ChannelApiError } from '@/lib/channel-manager/types';

// GET /api/admin/channels/[connectionId]/calendar?startDate=&endDate=&roomTypeId=
export async function GET(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!startDate || !endDate) throw new ChannelApiError('startDate and endDate are required');
    return NextResponse.json(await getChannelCalendar(connectionId, startDate, endDate, searchParams.get('roomTypeId')));
  } catch (err) {
    return errorResponse(err, 'Error loading channel calendar');
  }
}
