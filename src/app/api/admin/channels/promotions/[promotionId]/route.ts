import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { PromotionChanges, serializePromotion, updatePromotion } from '@/lib/channel-manager/promotions';
import { updatePromotionSchema, zodMessage } from '@/lib/channel-manager/schemas';
import { ChannelApiError } from '@/lib/channel-manager/types';

// PATCH /api/admin/channels/promotions/[promotionId] - edit, pause (active: false) or resume
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ promotionId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { promotionId } = await params;
    const parsed = updatePromotionSchema.safeParse({ ...(await request.json()), promotionId });
    if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
    const { promotionId: _id, active, ...fields } = parsed.data;

    // null means "leave unchanged"
    const changes: PromotionChanges = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== null)
    );
    if (active !== null) changes.active = active;

    return NextResponse.json(serializePromotion(await updatePromotion(promotionId, changes)));
  } catch (err) {
    return errorResponse(err, 'Error updating promotion');
  }
}
