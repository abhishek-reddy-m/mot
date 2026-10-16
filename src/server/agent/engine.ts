/**
 * Agent engine: message in → stream of UI blocks out.
 *
 * Reads are answered immediately from live data. Writes from the whole
 * message are gathered into ONE signed plan the person confirms. Every
 * command is audit-logged. A language-model engine can be plugged in via
 * llm.ts; it must use the same tools and the same plan/confirm contract.
 */
import { PRODUCT_NAME } from '@/config/product';
import { prisma } from '@/lib/prisma';
import type { AgentBlock, AgentContextState, AgentEvent } from '@/lib/agent/blocks';
import type { Actor } from '../authz';
import { assertPropertyAccess, can } from '../authz';
import { hotelToday } from '../dates';
import { recordAudit } from '../services/audit';
import { enqueueTask, getConnection } from '../services/bridge';
import { bookingInclude, toBookingSummary } from '../services/mappers';
import { runWithLLM } from './llm';
import { parseMessage, WRITE_KINDS, type Intent } from './nlu';
import { claimPlan, signPlan, verifyPlan, type PlanStep } from './plan';
import { bookingActions, executeStep, followUps, maxRisk, planWrite, runRead, statusLine, type PlanOutput } from './tools';

export interface AgentRunInput {
  actor: Actor;
  propertyId: string;
  message: string;
  memory: AgentContextState;
}

export async function* runAgent(input: AgentRunInput): AsyncGenerator<AgentEvent> {
  const started = Date.now();
  const { actor, propertyId } = input;
  assertPropertyAccess(actor, propertyId);
  if (!can(actor, 'agent.use')) {
    yield { type: 'error', message: 'The agent is available to front desk, managers and owners.' };
    return;
  }
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, name: true, setupPath: true } });
  if (!property) {
    yield { type: 'error', message: 'Property not found.' };
    return;
  }
  const message = input.message.trim().slice(0, 600);
  const today = hotelToday();
  const ctx = { actor, propertyId, propertyName: property.name, today, memory: { ...input.memory }, message };

  // Hotels that kept their own PMS: the agent works it through the bridge.
  if (property.setupPath === 'BRIDGE') {
    yield* runBridged(input, message, today);
    yield { type: 'done', engine: 'deterministic', ms: Date.now() - started };
    return;
  }

  // Optional language-model engine (same tools, same confirmation contract).
  const llm = await runWithLLM(ctx);
  if (llm) {
    for (const e of llm) yield e;
    yield { type: 'done', engine: 'llm', ms: Date.now() - started };
    return;
  }

  const intents = parseMessage(message, today);
  const memory: AgentContextState = { ...input.memory };
  const steps: PlanStep[] = [];
  const warnings: string[] = [];
  let risk: PlanOutput['risk'] = 'low';
  let aborted = false;

  for (const intent of intents) {
    yield { type: 'status', text: statusLine(intent) };
    if (WRITE_KINDS.has(intent.kind)) {
      if (aborted) continue;
      const out = await planWrite({ ...ctx, memory }, intent);
      for (const b of out.blocks ?? []) yield { type: 'block', block: b };
      Object.assign(memory, out.memory ?? {});
      if (out.abort) {
        aborted = true;
        continue;
      }
      steps.push(...out.steps);
      warnings.push(...out.warnings);
      risk = maxRisk(risk, out.risk);
    } else {
      const out = await runRead({ ...ctx, memory }, intent);
      for (const b of out.blocks) yield { type: 'block', block: b };
      Object.assign(memory, out.memory ?? {});
    }
  }

  let planTitle: string | undefined;
  if (steps.length && !aborted) {
    planTitle = steps.length === 1 ? steps[0].summary : titleFor(intents, steps);
    const { token, expiresAt } = signPlan({ userId: actor.userId, propertyId, title: planTitle, steps });
    const block: AgentBlock = {
      type: 'plan',
      plan: {
        token,
        title: planTitle,
        steps: steps.map((s) => ({ summary: s.summary, detail: s.detail })),
        warnings: [...new Set(warnings)],
        risk,
        confirmLabel: steps.length === 1 ? 'Confirm' : `Confirm ${steps.length} changes`,
        expiresAt,
      },
    };
    yield { type: 'block', block };
  } else if (steps.length && aborted) {
    yield { type: 'block', block: { type: 'text', text: 'I’ve held off on the other changes until that’s sorted.' } };
  }

  const isOnlyUnknown = intents.length === 1 && intents[0].kind === 'unknown';
  if (!steps.length && !isOnlyUnknown) {
    yield { type: 'block', block: { type: 'suggestions', items: followUps(intents) } };
  }
  yield { type: 'context', context: memory };

  await recordAudit({ actor, source: 'agent' }, propertyId, 'COMMAND', planTitle ? `Asked: “${message.slice(0, 120)}” → proposed ${planTitle}` : `Asked: “${message.slice(0, 160)}”`, {
    message: message.slice(0, 300),
    intents: intents.map((i) => i.kind),
    engine: 'deterministic',
  });
  yield { type: 'done', engine: 'deterministic', ms: Date.now() - started };
}

async function* runBridged(input: AgentRunInput, message: string, today: string): AsyncGenerator<AgentEvent> {
  const { actor, propertyId } = input;
  const connection = await getConnection(propertyId);
  if (!connection) {
    yield { type: 'block', block: { type: 'text', text: 'Your hotel runs on its own PMS, and it isn’t connected yet. Connect it once and I can look things up and make changes there for you.' } };
    yield { type: 'block', block: { type: 'navigate', label: 'Connect your PMS', href: '/admin/connect', description: 'Desktop connector or secure cloud browser' } };
    return;
  }
  if (!can(actor, 'bridge.use')) {
    yield { type: 'error', message: 'Your role can’t send work to the PMS.' };
    return;
  }
  const intents = parseMessage(message, today);
  const isWrite = intents.some((i) => WRITE_KINDS.has(i.kind));
  yield { type: 'status', text: `Asking ${connection.system}…` };
  if (!isWrite) {
    // Look-ups are read-only for the operator, so they go straight through.
    const { task } = await enqueueTask({ actor, source: 'agent' }, propertyId, { kind: 'LOOKUP', instruction: message });
    yield { type: 'block', block: { type: 'bridgeTask', taskId: task.id, system: connection.system, instruction: task.instruction, kind: task.kind } };
    await recordAudit({ actor, source: 'agent' }, propertyId, 'COMMAND', `Asked ${connection.system}: “${message.slice(0, 140)}”`, { message: message.slice(0, 300), engine: 'bridge' });
    return;
  }
  const steps: PlanStep[] = [
    {
      tool: 'bridge_task',
      args: { propertyId, instruction: message, kind: 'ACTION' },
      summary: `In ${connection.system}: ${message}`,
      detail: 'The operator makes only this change and reports exactly what it did.',
    },
  ];
  const { token, expiresAt } = signPlan({ userId: actor.userId, propertyId, title: `Do this in ${connection.system}`, steps });
  yield {
    type: 'block',
    block: {
      type: 'plan',
      plan: {
        token,
        title: `Do this in ${connection.system}`,
        steps: steps.map((s) => ({ summary: s.summary, detail: s.detail })),
        warnings: [`This changes data in ${connection.system}, not in ${PRODUCT_NAME}.`],
        risk: 'medium',
        confirmLabel: 'Send to PMS',
        expiresAt,
      },
    },
  };
  await recordAudit({ actor, source: 'agent' }, propertyId, 'COMMAND', `Asked: “${message.slice(0, 120)}” → proposed a ${connection.system} change`, { message: message.slice(0, 300), engine: 'bridge' });
}

function titleFor(intents: Intent[], steps: PlanStep[]): string {
  const primary = steps[0].summary;
  const kinds = new Set(intents.map((i) => i.kind));
  if (kinds.has('autoAssignCleaning')) return `Assign ${steps.length} rooms to housekeeping`;
  if (kinds.has('assignArrivals')) return `Assign rooms for ${steps.length} arrivals`;
  if (kinds.has('adjustRates')) return `Update rates (${steps.length} changes)`;
  if (kinds.has('roomStatus')) return `Update ${steps.length} rooms`;
  const short = (x: string) => x.replace(/ → .*$/, '').replace(/ \([A-Z0-9]+\)$/, '');
  if (steps.length === 2) {
    const second = short(steps[1].summary).replace(/ to .*$/, '').replace(/^Add note$/, 'add a note');
    return `${short(primary)} and ${second.charAt(0).toLowerCase()}${second.slice(1)}`;
  }
  return `${short(primary)} + ${steps.length - 1} more`;
}

export interface ConfirmResult {
  blocks: AgentBlock[];
  context: AgentContextState;
}

/** Execute a signed plan after the person confirms it. */
export async function confirmPlan(actor: Actor, token: string): Promise<ConfirmResult> {
  const plan = verifyPlan(token, actor.userId);
  assertPropertyAccess(actor, plan.pid);
  if (!(await claimPlan(plan.pid, plan.nonce, actor.userId))) {
    return { blocks: [{ type: 'result', ok: true, title: 'Already confirmed', lines: ['This plan was already confirmed, so nothing ran twice.'] }], context: {} };
  }
  const ctx = { actor, source: 'agent' as const };
  const lines: string[] = [];
  const touched = new Set<string>();
  const bridged: NonNullable<Awaited<ReturnType<typeof executeStep>>['bridgeTask']>[] = [];
  let failed = false;
  for (const [i, step] of plan.steps.entries()) {
    if (failed) {
      lines.push(`○ Not run: ${step.summary}`);
      continue;
    }
    const r = await executeStep(ctx, step);
    lines.push(`${r.ok ? '✓' : '✗'} ${r.line}`);
    if (r.bookingId) touched.add(r.bookingId);
    if (r.bridgeTask) bridged.push(r.bridgeTask);
    if (!r.ok) {
      failed = true;
      if (i < plan.steps.length - 1) lines.push('Stopped here so nothing half-finished goes through.');
    }
  }
  await recordAudit(ctx, plan.pid, 'PLAN_EXECUTED', `${failed ? 'Partly carried out' : 'Carried out'}: ${plan.title}`, {
    nonce: plan.nonce,
    steps: plan.steps.map((s) => s.summary),
    ok: !failed,
  });

  const blocks: AgentBlock[] = [
    {
      type: 'result',
      ok: !failed,
      title: failed
        ? 'Some changes didn’t go through'
        : bridged.length === plan.steps.length
          ? `Sent to ${bridged[0].system} — the operator is on it`
          : plan.steps.length === 1
            ? 'Done'
            : `Done — ${plan.steps.length} changes made`,
      lines,
    },
  ];
  for (const t of bridged) blocks.push({ type: 'bridgeTask', taskId: t.id, system: t.system, instruction: t.instruction, kind: t.kind });
  const context: AgentContextState = {};
  const today = hotelToday();
  for (const id of [...touched].slice(0, 2)) {
    const b = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!b) continue;
    const summary = toBookingSummary(b);
    blocks.push({ type: 'booking', booking: summary, actions: bookingActions(summary, today) });
    Object.assign(context, { lastBookingId: summary.id, lastBookingCode: summary.code, lastGuestName: summary.guest.name, lastRoomNumber: summary.room?.number });
  }
  const tools = new Set(plan.steps.map((s) => s.tool));
  const next: string[] = [];
  if (tools.has('check_in')) next.push('who else is arriving today?');
  if (tools.has('check_out')) next.push('auto-assign housekeeping', 'who else is leaving today?');
  if (tools.has('assign_cleaning')) next.push('show the housekeeping board');
  if (tools.has('adjust_rates')) next.push('forecast the next 3 weekends');
  if (tools.has('set_out_of_order')) next.push('show out-of-order rooms');
  if (!next.length) next.push('brief me');
  blocks.push({ type: 'suggestions', items: [...new Set(next)].slice(0, 3) });
  return { blocks, context };
}
