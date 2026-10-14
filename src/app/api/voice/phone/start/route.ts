import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callerNumber } from '@/lib/phone';
import { DomainError } from '@/server/errors';
import { PHONE_SESSION_VARIABLE, PHONE_WEBHOOK_HEADER, phonePropertyForAgent, singleModelPrompt, verifyPhoneWebhook } from '@/server/voice/elevenlabs';
import { openPhoneSession } from '@/server/voice/sessions';

export const dynamic = 'force-dynamic';

const body = z.object({
  agent_id: z.string().max(200).default(''),
  caller_id: z.string().max(200).nullish(),
  called_number: z.string().max(200).nullish(),
  call_sid: z.string().max(200).nullish(),
  conversation_id: z.string().max(200).nullish(),
});

/** What ElevenLabs needs to start the call: our prompt and greeting, plus the session token its tools send back. */
const answer = (token: string, prompt: string, firstMessage: string) =>
  NextResponse.json({
    type: 'conversation_initiation_client_data',
    dynamic_variables: { [PHONE_SESSION_VARIABLE]: token },
    conversation_config_override: { agent: { prompt: { prompt }, first_message: firstMessage } },
  });

/** A call we won't take still gets a short, polite answer — an error here would just drop it. */
function decline(e: unknown) {
  const code = e instanceof DomainError ? e.code : null;
  const line =
    code === 'RATE_LIMITED'
      ? 'Thanks for calling — our lines are very busy right now. Please try again in a few minutes.'
      : code === 'VOICE_OFF' || code === 'NOT_FOUND'
        ? 'Thanks for calling. Our virtual assistant isn’t taking calls on this line right now — please try again later.'
        : 'Thanks for calling. I’m sorry — we’re having trouble right now. Please try again in a few minutes.';
  return answer('', 'You have already told the caller you can’t help on this call. Say a brief goodbye and end the call. Do not offer anything else.', line);
}

/**
 * POST /api/voice/phone/start — ElevenLabs' conversation-initiation webhook
 * for inbound calls to a hotel's phone agent. Authenticated by the derived
 * header secret; answers with the hotel's prompt and a signed session token.
 */
export async function POST(request: NextRequest) {
  // Phone lines run on ElevenLabs whichever provider serves the booking page (the check needs its key).
  if (!verifyPhoneWebhook(request.headers.get(PHONE_WEBHOOK_HEADER))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return decline(null);
  const call = parsed.data;
  try {
    const propertyId = await phonePropertyForAgent(call.agent_id);
    if (!propertyId) throw new DomainError(404, 'NOT_FOUND', 'No hotel answers on this agent.');
    const { token, ctx } = await openPhoneSession({
      propertyId,
      callerNumber: callerNumber(call.caller_id),
      externalId: call.conversation_id || call.call_sid || null,
    });
    return answer(token, singleModelPrompt(ctx.prompts), ctx.firstMessage);
  } catch (e) {
    if (!(e instanceof DomainError)) console.error('phone call start failed', e);
    else if (e.code !== 'RATE_LIMITED') console.warn(`phone call declined (${e.code}) for agent ${call.agent_id}`);
    return decline(e);
  }
}
