import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePropertyAccess, logAgentAction, AgentUnauthorized, AgentForbidden } from '@/lib/agent/rbac';

const MODES = ['CLASSIC', 'AGENTIC'] as const;

/**
 * PATCH /api/properties/[propertyId]/interface-mode
 * Flips a property between CLASSIC and AGENTIC interface modes.
 * OWNER/MANAGER/ADMIN only. The switch is audit-logged.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const body = await request.json();
    const { interfaceMode } = body ?? {};

    if (!MODES.includes(interfaceMode)) {
      return NextResponse.json(
        { message: 'interfaceMode must be CLASSIC or AGENTIC' },
        { status: 400 }
      );
    }

    const identity = await requirePropertyAccess(propertyId, 'mode-switch');

    const before = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { interfaceMode: true, name: true },
    });
    if (!before) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { interfaceMode },
      select: { id: true, name: true, interfaceMode: true },
    });

    await logAgentAction(
      propertyId,
      identity.userId,
      'MODE_SWITCH',
      JSON.stringify({ from: before.interfaceMode, to: interfaceMode })
    );

    return NextResponse.json({ property });
  } catch (e) {
    if (e instanceof AgentUnauthorized) {
      return NextResponse.json({ message: e.message }, { status: 401 });
    }
    if (e instanceof AgentForbidden) {
      return NextResponse.json({ message: e.message }, { status: 403 });
    }
    console.error('Interface mode switch error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
