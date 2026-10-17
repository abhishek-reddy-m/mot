import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import {
  applyMarkup,
  applyRateChange,
  applyRestrictions,
  previewMarkup,
  previewRateChange,
  previewRestrictions,
} from '@/lib/channel-manager/rates';
import { markupSchema, rateChangeSchema, restrictionSchema, zodMessage } from '@/lib/channel-manager/schemas';
import { ChannelApiError } from '@/lib/channel-manager/types';

/**
 * POST /api/admin/channels/rates
 * { kind: 'rates' | 'restrictions' | 'markup', preview?: boolean, ...change }
 * With preview: true nothing is written - the planned change is returned.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { kind, preview = false, ...body } = await request.json();
    const actor = session.user.email ?? session.user.id;

    if (kind === 'rates') {
      const parsed = rateChangeSchema.safeParse(body);
      if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
      return NextResponse.json(preview ? await previewRateChange(parsed.data) : await applyRateChange(parsed.data, actor));
    }
    if (kind === 'restrictions') {
      const parsed = restrictionSchema.safeParse(body);
      if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
      return NextResponse.json(preview ? await previewRestrictions(parsed.data) : await applyRestrictions(parsed.data, actor));
    }
    if (kind === 'markup') {
      const parsed = markupSchema.safeParse(body);
      if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
      return NextResponse.json(preview ? await previewMarkup(parsed.data) : await applyMarkup(parsed.data));
    }
    throw new ChannelApiError('kind must be rates, restrictions or markup');
  } catch (err) {
    return errorResponse(err, 'Error changing channel rates');
  }
}
