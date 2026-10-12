/**
 * ElevenLabs Agents as the voice provider.
 *
 * StayOS provisions two private agents in the hotel group's ElevenLabs
 * account — one for guests, one for staff — with our hotel tools registered
 * as *client* tools: ElevenLabs asks the browser to run them, and the
 * browser calls the same StayOS endpoints GPT-Live uses (signed voice token
 * for guests; the permission-checked agent pipeline for staff). Hotel
 * specifics (name, today's date, house rules, greeting) are sent per
 * conversation as prompt overrides. Agents and tools are re-synced whenever
 * their configuration in this file changes (tracked by a hash).
 */
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { DomainError } from '../errors';
import { GUEST_TOOLS, STAFF_TOOLS, type FunctionToolSpec } from './live';

const BASE = (process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io').replace(/\/$/, '');
const LLM = process.env.ELEVENLABS_LLM || 'gemini-2.5-flash';
const CONFIG_VERSION = 1;

type Audience = 'guest' | 'staff';

export function elevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

class ElevenLabsError extends Error {
  constructor(
    readonly status: number | null,
    readonly detail: string,
  ) {
    super(detail);
  }
}

async function call<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new DomainError(503, 'VOICE_DISABLED', 'The voice agent isn’t connected yet — add ELEVENLABS_API_KEY to turn it on.');
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'xi-api-key': key, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
  } catch {
    throw new ElevenLabsError(null, 'network');
  }
  const text = await res.text();
  if (!res.ok) throw new ElevenLabsError(res.status, errorDetail(text));
  return (text ? JSON.parse(text) : {}) as T;
}

/** Pull a readable message out of ElevenLabs' error bodies ({detail: string | {message} | [{msg}]}). */
function errorDetail(text: string): string {
  try {
    const body = JSON.parse(text) as { detail?: unknown; message?: unknown };
    const d = body.detail ?? body.message;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x) => (x && typeof x === 'object' && 'msg' in x ? `${(x as { loc?: unknown[] }).loc?.join('.') ?? ''} ${(x as { msg: string }).msg}`.trim() : String(x))).join('; ');
    if (d && typeof d === 'object' && 'message' in d) return String((d as { message: unknown }).message);
  } catch {
    /* not JSON */
  }
  return text.slice(0, 200) || 'no details';
}

/** A reason the hotel's team can act on (never echoes the key). */
export function describeElevenLabsError(e: unknown): string {
  if (e instanceof DomainError) return e.message;
  if (!(e instanceof ElevenLabsError)) return 'Couldn’t start the voice line just now. Please try again.';
  const detail = e.detail.length > 280 ? `${e.detail.slice(0, 277)}…` : e.detail;
  switch (e.status) {
    case null:
      return 'Couldn’t reach ElevenLabs just now — try again in a moment.';
    case 401:
      return 'ElevenLabs didn’t accept the API key. Re-check ELEVENLABS_API_KEY in Vercel (Settings → Environment Variables), then redeploy.';
    case 403:
      return `This ElevenLabs key isn’t allowed to manage agents. Create a key with “ElevenLabs Agents” write access (or no restrictions). ElevenLabs says: ${detail}`;
    case 402:
    case 429:
      return `ElevenLabs refused for quota or rate limits — check your plan and usage at elevenlabs.io. ElevenLabs says: ${detail}`;
    default:
      return `ElevenLabs returned an error (${e.status}). ${detail}`;
  }
}

// ---------------------------------------------------------------------------
// Desired configuration
// ---------------------------------------------------------------------------

type Schema = Record<string, unknown>;

/**
 * ElevenLabs takes a restricted JSON-schema dialect: no additionalProperties,
 * minimum/maximum, format or default, and every model-filled property should
 * carry a description. Nullable fields (OpenAI strict mode's way of saying
 * optional) become plain optional fields.
 */
function toElevenLabsSchema(node: Schema, name = 'value'): Schema {
  const out: Schema = {};
  const type = node.type;
  if (type === 'object' || node.properties) {
    out.type = 'object';
    const props = (node.properties ?? {}) as Record<string, Schema>;
    out.properties = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, toElevenLabsSchema(v, k)]));
    const nullable = (v: Schema) => Array.isArray(v.type) && v.type.includes('null');
    const required = Array.isArray(node.required) ? (node.required as string[]).filter((k) => props[k] && !nullable(props[k])) : [];
    if (required.length) out.required = required;
    if (node.description) out.description = node.description;
    return out;
  }
  if (type === 'array') {
    out.type = 'array';
    out.items = toElevenLabsSchema((node.items ?? { type: 'string' }) as Schema, name);
  } else {
    out.type = Array.isArray(type) ? (type.find((t) => t !== 'null') ?? 'string') : type;
    if (Array.isArray(node.enum)) out.enum = node.enum.map(String);
  }
  const range = [node.minimum !== undefined ? `min ${node.minimum}` : '', node.maximum !== undefined ? `max ${node.maximum}` : ''].filter(Boolean).join(', ');
  const base = typeof node.description === 'string' && node.description ? node.description : name.replace(/_/g, ' ');
  out.description = range ? `${base} (${range})` : base;
  return out;
}

function toolConfig(spec: FunctionToolSpec, audience: Audience) {
  const params = spec.parameters as Schema;
  const hasParams = Object.keys((params.properties ?? {}) as object).length > 0;
  return {
    type: 'client' as const,
    name: spec.name,
    description: spec.description,
    expects_response: true,
    // Staff requests run the full agent pipeline; guest lookups are quick.
    response_timeout_secs: audience === 'staff' ? 60 : 20,
    ...(hasParams ? { parameters: toElevenLabsSchema(params) } : {}),
  };
}

const CLIENT_EVENTS = ['conversation_initiation_metadata', 'audio', 'interruption', 'user_transcript', 'agent_response', 'agent_response_correction', 'client_tool_call', 'agent_tool_response', 'vad_score', 'ping'];

function agentConfig(audience: Audience, toolIds: string[]) {
  const guest = audience === 'guest';
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  return {
    name: guest ? 'StayOS — guest front desk' : 'StayOS — staff hands-free',
    tags: ['stayos', guest ? 'guest' : 'staff'],
    conversation_config: {
      agent: {
        first_message: guest ? 'Hi, thanks for calling. How can I help?' : 'Hi — what do you need?',
        language: 'en',
        // The real, hotel-specific prompt arrives per conversation as an override.
        prompt: {
          prompt: guest ? 'You are a hotel’s voice front desk. Use your tools for every fact.' : 'You are a hotel’s hands-free staff assistant. Use the front_desk tool for every request.',
          llm: LLM,
          temperature: 0.3,
          tool_ids: toolIds,
          built_in_tools: { end_call: { name: 'end_call', description: '', params: { system_tool_type: 'end_call' } } },
        },
        max_conversation_duration_message: guest ? 'I need to wrap up now — please call back any time.' : 'Wrapping up this session — tap Talk to start again.',
      },
      tts: { model_id: 'eleven_flash_v2', ...(voiceId ? { voice_id: voiceId } : {}) },
      conversation: { max_duration_seconds: guest ? 600 : 1800, client_events: CLIENT_EVENTS },
    },
    platform_settings: {
      auth: { enable_auth: true },
      overrides: {
        conversation_config_override: {
          agent: { first_message: true, language: true, prompt: { prompt: true } },
          tts: { voice_id: true },
        },
      },
    },
  };
}

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify({ v: CONFIG_VERSION, ...((v as object) ?? {}) })).digest('hex');

// ---------------------------------------------------------------------------
// Provisioning (create once, update on change)
// ---------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function syncTool(tx: Tx, spec: FunctionToolSpec, audience: Audience): Promise<string> {
  const config = toolConfig(spec, audience);
  const key = `elevenlabs:tool:${audience}:${spec.name}`;
  const configHash = hash(config);
  const row = await tx.voiceProviderAgent.findUnique({ where: { key } });
  if (row?.configHash === configHash) return row.externalId;
  let id: string | null = null;
  if (row) {
    try {
      await call('PATCH', `/v1/convai/tools/${encodeURIComponent(row.externalId)}`, { tool_config: config });
      id = row.externalId;
    } catch (e) {
      if (!(e instanceof ElevenLabsError) || e.status !== 404) throw e;
    }
  }
  if (!id) id = (await call<{ id: string }>('POST', '/v1/convai/tools', { tool_config: config })).id;
  await tx.voiceProviderAgent.upsert({ where: { key }, create: { key, externalId: id, configHash }, update: { externalId: id, configHash } });
  return id;
}

async function syncAgent(audience: Audience): Promise<string> {
  const own = audience === 'guest' ? process.env.ELEVENLABS_GUEST_AGENT_ID : process.env.ELEVENLABS_STAFF_AGENT_ID;
  if (own) return own; // bring-your-own agent: managed in ElevenLabs

  const key = `elevenlabs:${audience.toUpperCase()}`;
  const specs = audience === 'guest' ? GUEST_TOOLS : STAFF_TOOLS;
  // Fast path without the lock: nothing changed since the last sync.
  const desiredHash = hash({ tools: specs.map((s) => toolConfig(s, audience)), agent: agentConfig(audience, []) });
  const cached = await prisma.voiceProviderAgent.findUnique({ where: { key } });
  if (cached?.configHash === desiredHash) return cached.externalId;

  // One instance provisions at a time (the lock is released with the transaction).
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      const row = await tx.voiceProviderAgent.findUnique({ where: { key } });
      if (row?.configHash === desiredHash) return row.externalId;
      const toolIds: string[] = [];
      for (const spec of specs) toolIds.push(await syncTool(tx, spec, audience));
      const body = agentConfig(audience, toolIds);
      let id: string | null = null;
      if (row) {
        try {
          await call('PATCH', `/v1/convai/agents/${encodeURIComponent(row.externalId)}`, body);
          id = row.externalId;
        } catch (e) {
          if (!(e instanceof ElevenLabsError) || e.status !== 404) throw e;
        }
      }
      if (!id) id = (await call<{ agent_id: string }>('POST', '/v1/convai/agents/create', body)).agent_id;
      await tx.voiceProviderAgent.upsert({ where: { key }, create: { key, externalId: id, configHash: desiredHash }, update: { externalId: id, configHash: desiredHash } });
      return id;
    },
    { maxWait: 15_000, timeout: 90_000 },
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Everything the browser needs to start one conversation: a single-use
 * signed URL for the private agent, the hotel-specific prompt and greeting
 * (sent as overrides), and the client tools to register.
 */
export async function startElevenLabsConversation(input: {
  audience: Audience;
  prompts: { instructions: string; backendInstructions: string };
  firstMessage: string;
  tools: FunctionToolSpec[];
}): Promise<{ signedUrl: string; prompt: string; firstMessage: string; tools: string[] }> {
  try {
    const agentId = await syncAgent(input.audience);
    const { signed_url } = await call<{ signed_url: string }>('GET', `/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
    return { signedUrl: signed_url, prompt: singleModelPrompt(input.prompts), firstMessage: input.firstMessage, tools: input.tools.map((t) => t.name) };
  } catch (e) {
    if (e instanceof DomainError) throw e;
    console.error('ElevenLabs conversation start failed:', e instanceof ElevenLabsError ? `${e.status} ${e.detail}` : e);
    throw new DomainError(502, 'VOICE_UPSTREAM', describeElevenLabsError(e));
  }
}

/** GPT-Live splits voice and task prompts; an ElevenLabs agent is one model doing both. */
function singleModelPrompt(p: { instructions: string; backendInstructions: string }) {
  return [
    'You talk with people by voice and you can call tools directly. Wherever these instructions say "delegate", call the right tool yourself, then answer from its result.',
    '',
    '# How you speak',
    p.instructions,
    '',
    '# How you work',
    p.backendInstructions,
  ].join('\n');
}

/** Console setup check: key works, and both agents exist and are in sync. */
export async function checkElevenLabs(): Promise<{ model: string; role: string; ok: boolean; reason: string | null }[]> {
  try {
    await call('GET', '/v1/convai/agents?page_size=1');
  } catch (e) {
    return [{ model: 'ElevenLabs API key', role: 'Account', ok: false, reason: describeElevenLabsError(e) }];
  }
  const rows: { model: string; role: string; ok: boolean; reason: string | null }[] = [{ model: 'ElevenLabs API key', role: 'Account', ok: true, reason: null }];
  for (const audience of ['guest', 'staff'] as const) {
    const role = audience === 'guest' ? 'Guest voice agent' : 'Staff voice agent';
    try {
      const id = await syncAgent(audience);
      rows.push({ model: id, role, ok: true, reason: null });
    } catch (e) {
      rows.push({ model: LLM, role, ok: false, reason: describeElevenLabsError(e) });
    }
  }
  return rows;
}
