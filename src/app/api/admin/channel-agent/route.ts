import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/channel-manager/api';
import { AgentConfigError, sendToAgent } from '@/lib/channel-agent/agent';
import { conversationView } from '@/lib/channel-agent/view';

// Agent turns can take a while (several model calls + OTA pushes)
export const maxDuration = 300;

// GET /api/admin/channel-agent            - the admin's recent conversations
// GET /api/admin/channel-agent?id=<conv>  - one conversation as chat items
export async function GET(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const conversation = await prisma.agentConversation.findFirst({ where: { id, userId: session.user.id } });
      if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      return NextResponse.json(conversationView(conversation));
    }
    const conversations = await prisma.agentConversation.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ conversations, configured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
  } catch (err) {
    console.error('Error loading agent conversations:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/channel-agent
 * { conversationId?, message?, decisions?: { [toolUseId]: boolean }, autoApprove?: boolean }
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    if (body.message !== undefined && body.message !== null && typeof body.message !== 'string') {
      return NextResponse.json({ error: 'message must be a string' }, { status: 400 });
    }
    if (typeof body.message === 'string' && body.message.length > 4000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }
    const decisions =
      body.decisions && typeof body.decisions === 'object'
        ? Object.fromEntries(Object.entries(body.decisions).map(([id, value]) => [id, value === true]))
        : null;

    const result = await sendToAgent({
      userId: session.user.id,
      actor: `agent (${session.user.email ?? session.user.id})`,
      conversationId: typeof body.conversationId === 'string' ? body.conversationId : null,
      message: body.message ?? null,
      decisions,
      autoApprove: body.autoApprove === true,
    });
    return NextResponse.json({ ...conversationView(result.conversation), status: result.status, error: result.error ?? null });
  } catch (err) {
    if (err instanceof AgentConfigError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Channel agent error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
