import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleRoute, json, parseQuery } from '@/server/http';
import { startElevenLabsConversation } from '@/server/voice/elevenlabs';
import { openVoiceSession } from '@/server/voice/sessions';

const query = z.object({ propertyId: z.string().min(1), audience: z.enum(['guest', 'staff']).default('guest') });

/**
 * POST /api/voice/elevenlabs/session?propertyId&audience — ElevenLabs. Returns
 * a single-use signed URL for the private agent, the hotel's prompt and
 * greeting (sent as overrides), the client tools to register, and the signed
 * token the browser uses for this session's tool calls.
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const q = parseQuery(request, query);
  const session = await openVoiceSession(request, q, async (ctx) => ({
    externalId: null,
    result: await startElevenLabsConversation({ audience: ctx.audience, prompts: ctx.prompts, firstMessage: ctx.firstMessage, tools: ctx.tools }),
  }));
  return json({ ...session.result, token: session.token });
});
