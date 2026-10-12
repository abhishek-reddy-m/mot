/**
 * Command router for the agentic (beta) interface.
 *
 * TODAY: deterministic intent parsing (src/lib/agent/intents.ts) over the
 * shared tool layer (src/lib/agent/tools.ts). No LLM key needed — every
 * answer is computed from real DB data, and results link into the classic
 * views (hybrid UI: chat for asking, tables for scanning).
 *
 * TOMORROW: when OPENAI_API_KEY and AGENT_LLM_ENABLED=true are configured,
 * routeCommand() can delegate to routeWithLLM(), an OpenAI tool-calling loop
 * whose tools are the SAME functions in tools.ts (plus the write tools from
 * the agent API contracts — createBookingHold, cancelBooking, modifyBooking —
 * which stay LLM-gated behind the agent:write scope and are NOT reachable
 * from the deterministic parser).
 */

import {
  AgentContext,
  ToolResult,
  AgentLink,
  toolGetProperty,
  toolListArrivals,
  toolListDepartures,
  toolGetAvailability,
  toolGetReservation,
  toolSearchReservations,
  toolGetOccupancy,
} from './tools';
import { parseCommand, HELP_TEXT, Intent } from './intents';

export interface AgentReply {
  text: string;
  links: AgentLink[];
  intent: string;
  engine: 'deterministic' | 'llm';
}

export const LLM_AGENT_AVAILABLE =
  !!process.env.OPENAI_API_KEY && process.env.AGENT_LLM_ENABLED === 'true';

/**
 * LLM tool-calling agent (FUTURE). Plug-in point: when keys exist, build an
 * OpenAI function-calling loop here whose tool implementations are the
 * functions in tools.ts. Write tools (createBookingHold / cancelBooking /
 * modifyBooking, per the agent API contracts) are only registered on this
 * path — never on the deterministic path.
 */
export async function routeWithLLM(
  _ctx: AgentContext,
  _message: string
): Promise<AgentReply> {
  // Not wired yet: requires OPENAI_API_KEY + AGENT_LLM_ENABLED=true.
  // When implemented, register tools.ts functions (+ write tools) as
  // OpenAI function definitions and loop until a final answer.
  return {
    text: 'The LLM agent is not configured yet (no API key). Using the deterministic command parser instead.',
    links: [],
    intent: 'llm-unavailable',
    engine: 'deterministic',
  };
}

async function runIntent(ctx: AgentContext, intent: Intent): Promise<ToolResult> {
  switch (intent.type) {
    case 'arrivals':
      return toolListArrivals(ctx, intent.date);
    case 'departures':
      return toolListDepartures(ctx, intent.date);
    case 'availability':
      return toolGetAvailability(ctx, intent.checkIn, intent.checkOut, intent.guests);
    case 'reservation':
      return toolGetReservation(ctx, intent.id);
    case 'search':
      return toolSearchReservations(ctx, intent.name);
    case 'occupancy':
      return toolGetOccupancy(ctx, intent.from, intent.to);
    case 'property':
      return toolGetProperty(ctx);
    case 'help':
      return {
        ok: true,
        summary: HELP_TEXT,
        links: [
          { label: 'Front desk', href: '/front-desk' },
          { label: 'Admin dashboard', href: '/admin/dashboard' },
        ],
      };
    case 'unknown':
    default:
      return {
        ok: true,
        summary:
          'I didn\u2019t understand that. Try one of these:\n' + HELP_TEXT,
        links: [],
      };
  }
}

export async function routeCommand(ctx: AgentContext, message: string): Promise<AgentReply> {
  const clean = message.trim().slice(0, 500);
  if (!clean) {
    return { text: 'Type a command to get started — or ask for "help".', links: [], intent: 'empty', engine: 'deterministic' };
  }

  // Future LLM path (flag-gated; falls back to deterministic when unavailable).
  if (LLM_AGENT_AVAILABLE) {
    const llmReply = await routeWithLLM(ctx, clean);
    if (llmReply.intent !== 'llm-unavailable') return llmReply;
  }

  const intent = parseCommand(clean);
  const result = await runIntent(ctx, intent);
  return {
    text: result.summary,
    links: result.links ?? [],
    intent: intent.type,
    engine: 'deterministic',
  };
}
