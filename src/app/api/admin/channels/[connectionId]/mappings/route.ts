import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { getMappingOptions, saveMappings } from '@/lib/channel-manager/connections';
import { mappingsSchema, zodMessage } from '@/lib/channel-manager/schemas';
import { ChannelApiError } from '@/lib/channel-manager/types';

type Params = { params: Promise<{ connectionId: string }> };

// GET /api/admin/channels/[connectionId]/mappings - OTA rooms, PMS rooms and suggested mapping
export async function GET(_request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    return NextResponse.json(await getMappingOptions(connectionId));
  } catch (err) {
    return errorResponse(err, 'Error loading room mapping options');
  }
}

// PUT /api/admin/channels/[connectionId]/mappings - replace the room mapping
export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const parsed = mappingsSchema.safeParse(await request.json());
    if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
    const mappings = await saveMappings(connectionId, parsed.data.mappings);
    return NextResponse.json({ mappings });
  } catch (err) {
    return errorResponse(err, 'Error saving room mappings');
  }
}
