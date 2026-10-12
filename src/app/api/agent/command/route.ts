import { NextRequest, NextResponse } from 'next/server';
import { routeCommand } from '@/lib/agent/router';
import { requirePropertyAccess, logAgentAction, AgentUnauthorized, AgentForbidden } from '@/lib/agent/rbac';

/**
 * POST /api/agent/command — agentic (beta) natural-language command endpoint.
 * Staff only (ADMIN/OWNER/MANAGER/FRONT_DESK), scoped to one property.
 * Every command is audit-logged. No LLM key needed: deterministic intents
 * over real DB data (see src/lib/agent/router.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, message } = body ?? {};

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ message: 'propertyId is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ message: 'message is required' }, { status: 400 });
    }

    const identity = await requirePropertyAccess(propertyId, 'command');
    const reply = await routeCommand({ propertyId, userId: identity.userId }, message);

    await logAgentAction(
      propertyId,
      identity.userId,
      'COMMAND',
      JSON.stringify({ intent: reply.intent, engine: reply.engine, message: message.trim().slice(0, 200) })
    );

    return NextResponse.json(reply);
  } catch (e) {
    if (e instanceof AgentUnauthorized) {
      return NextResponse.json({ message: e.message }, { status: 401 });
    }
    if (e instanceof AgentForbidden) {
      return NextResponse.json({ message: e.message }, { status: 403 });
    }
    console.error('Agent command error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
