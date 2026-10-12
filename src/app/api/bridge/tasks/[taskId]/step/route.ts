import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { conflict } from '@/server/errors';
import { handleRoute, json, parseJson } from '@/server/http';
import { authenticateBridge, loadTaskForCaller, readCredentials } from '@/server/services/bridge';
import { MAX_STEPS, operatorStep, totp } from '@/server/bridge/operator';

type Params = { params: Promise<{ taskId: string }> };

const schema = z.object({
  screenshot: z
    .string()
    .max(4_000_000) // stays under Vercel's 4.5 MB request-body limit
    .regex(/^data:image\/(png|jpeg);base64,/, 'must be a PNG or JPEG data URL'),
  currentUrl: z.string().max(2000).optional(),
  previousResponseId: z.string().max(200).nullable().optional(),
  pending: z.object({ callId: z.string().max(200), type: z.enum(['computer', 'credential']) }).nullable().optional(),
});

/**
 * POST — one operator step for a running task: screenshot in, next actions
 * out. Only our cloud worker ever receives a credential value, and only to
 * type it into the PMS login form.
 */
export const POST = handleRoute(async (request: NextRequest, { params }: Params) => {
  const { taskId } = await params;
  const caller = await authenticateBridge(request.headers.get('authorization'));
  const task = await loadTaskForCaller(caller, taskId);
  if (task.status !== 'RUNNING') throw conflict('This task is not running.');
  const body = await parseJson(request, schema);

  const payload = (task.payload ?? {}) as { steps?: number };
  const steps = (payload.steps ?? 0) + 1;
  if (steps > MAX_STEPS) {
    return json({ next: { kind: 'done', status: 'NEEDS_HELP', summary: `Stopped after ${MAX_STEPS} steps without finishing. Please check ${task.connection.system}.` } });
  }
  await prisma.bridgeTask.update({ where: { id: task.id }, data: { payload: { ...payload, steps } } });

  const connection = await prisma.pmsConnection.findUniqueOrThrow({ where: { id: task.connectionId }, include: { property: { select: { name: true } } } });
  const next = await operatorStep({
    task,
    connection,
    screenshot: body.screenshot,
    currentUrl: body.currentUrl,
    previousResponseId: body.previousResponseId,
    pending: body.pending,
  });

  if (next.kind === 'credential') {
    if (caller.kind !== 'worker') return json({ next: { kind: 'done', status: 'NEEDS_HELP', summary: `Please sign in to ${connection.system} in the StayOS browser window, then retry.` } });
    const creds = readCredentials(connection);
    if (!creds) return json({ next: { kind: 'done', status: 'NEEDS_HELP', summary: `No ${connection.system} login is stored for the cloud browser.` } });
    const value = next.field === 'username' ? creds.username : next.field === 'password' ? creds.password : creds.totpSecret ? totp(creds.totpSecret) : null;
    if (!value) return json({ next: { kind: 'done', status: 'NEEDS_HELP', summary: `${connection.system} asked for a one-time code but none is configured.` } });
    return json({ next: { ...next, value } });
  }
  return json({ next });
});
