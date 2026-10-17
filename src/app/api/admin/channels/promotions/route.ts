import { NextRequest, NextResponse } from 'next/server';
import type { PromotionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { createPromotion, serializePromotion } from '@/lib/channel-manager/promotions';
import { createPromotionSchema, zodMessage } from '@/lib/channel-manager/schemas';
import { ChannelApiError } from '@/lib/channel-manager/types';

// GET /api/admin/channels/promotions?connectionId=&status=
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const status = request.nextUrl.searchParams.get('status') as PromotionStatus | null;
    const promotions = await prisma.channelPromotion.findMany({
      where: {
        ...(connectionId ? { connectionId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(promotions.map(serializePromotion));
  } catch (err) {
    return errorResponse(err, 'Error listing promotions');
  }
}

// POST /api/admin/channels/promotions - create on one or more channels
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = createPromotionSchema.safeParse(await request.json());
    if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
    const { connectionIds, ...input } = parsed.data;
    const actor = session.user.email ?? session.user.id;

    const promotions = [];
    for (const connectionId of connectionIds) {
      promotions.push(serializePromotion(await createPromotion(connectionId, input, actor)));
    }
    return NextResponse.json(promotions, { status: 201 });
  } catch (err) {
    return errorResponse(err, 'Error creating promotion');
  }
}
