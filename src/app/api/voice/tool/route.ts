import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { forbidden } from '@/server/errors';
import { handleRoute, json, parseJson } from '@/server/http';
import { verifyVoiceToken } from '@/server/voice/live';
import { runGuestTool } from '@/server/voice/guestTools';

const schema = z.object({
  token: z.string().min(20).max(4000),
  name: z.string().min(1).max(64),
  arguments: z.string().max(8000).default('{}'),
});

/**
 * POST /api/voice/tool — run one guest voice tool for a live session. The
 * browser relays the delegated function call here and sends our output back
 * to GPT-Live; the signed token pins the call to its property and session.
 * (Staff tools go through the authenticated agent endpoints instead.)
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const body = await parseJson(request, schema);
  const t = verifyVoiceToken(body.token);
  if (t.aud !== 'GUEST') throw forbidden('Staff voice tools run through the console agent.');
  let args: unknown;
  try {
    args = JSON.parse(body.arguments || '{}');
  } catch {
    return json({ output: { error: 'Arguments were not valid JSON.' } });
  }
  let output: unknown;
  try {
    output = await runGuestTool(t.pid, body.name, args);
  } catch (e) {
    // Hand validation problems back to the model so it can correct itself.
    output = { error: e instanceof z.ZodError ? `Invalid arguments: ${e.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` : (e as Error).message };
  }
  await prisma.voiceSession.update({ where: { id: t.sid }, data: { toolCalls: { increment: 1 } } }).catch(() => undefined);
  return json({ output });
});
