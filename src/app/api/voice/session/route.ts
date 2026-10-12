import { NextRequest } from 'next/server';
import { z } from 'zod';
import { badRequest, DomainError } from '@/server/errors';
import { handleRoute, json, parseQuery } from '@/server/http';
import { createLiveSession } from '@/server/voice/live';
import { openVoiceSession } from '@/server/voice/sessions';
import { voiceProvider } from '@/server/voice/provider';

const query = z.object({ propertyId: z.string().min(1), audience: z.enum(['guest', 'staff']).default('guest') });

/**
 * POST /api/voice/session?propertyId&audience — GPT-Live. The body is the
 * browser's WebRTC SDP offer; returns the SDP answer plus a signed token the
 * browser uses for this session's tool calls.
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const q = parseQuery(request, query);
  if (voiceProvider() !== 'openai') throw new DomainError(503, 'VOICE_DISABLED', 'The GPT-Live voice line isn’t switched on.');
  const sdp = await request.text();
  if (!sdp.trim().startsWith('v=') || sdp.length > 64_000) throw badRequest('A WebRTC SDP offer is required.');
  const session = await openVoiceSession(request, q, async (ctx) => {
    const live = await createLiveSession({ sdp, voice: ctx.voice, ...ctx.prompts, tools: ctx.tools });
    return { externalId: live.sessionId, result: live.sdp };
  });
  return json({ sdp: session.result, token: session.token });
});
