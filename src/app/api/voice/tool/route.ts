import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { forbidden } from '@/server/errors';
import { handleRoute, json, parseJson } from '@/server/http';
import { verifyVoiceToken } from '@/server/voice/live';
import { guestToolOutput } from '@/server/voice/guestTools';

const MAX_TOOL_CALLS = 80;

const schema = z.object({
  token: z.string().min(20).max(4000),
  name: z.string().min(1).max(64),
  arguments: z.string().max(8000).default('{}'),
});

/**
 * POST /api/voice/tool — run one guest voice tool for a live session. The
 * browser relays the delegated function call here and sends our output back
 * to GPT-Live; the signed token pins the call to its property and session.
 * (Staff tools go through the authenticated agent endpoints instead; phone
 * calls use /api/voice/phone/tool.)
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const body = await parseJson(request, schema);
  const t = verifyVoiceToken(body.token);
  if (t.aud !== 'GUEST') throw forbidden('Staff voice tools run through the console agent.');
  if (t.ch) throw forbidden('Phone calls and WhatsApp run their tools through the phone line.');
  let args: unknown;
  try {
    args = JSON.parse(body.arguments || '{}');
  } catch {
    return json({ output: { error: 'Arguments were not valid JSON.' } });
  }
  // Count the call up front; a real conversation never needs this many lookups.
  const session = await prisma.voiceSession.update({ where: { id: t.sid }, data: { toolCalls: { increment: 1 } }, select: { toolCalls: true } }).catch(() => null);
  if (session && session.toolCalls > MAX_TOOL_CALLS) {
    return json({ output: { error: 'This call has made a lot of lookups already — offer to take a message for the team instead.' } });
  }
  return json({ output: await guestToolOutput(t.pid, body.name, args) });
});
