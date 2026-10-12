/**
 * GPT-Live voice sessions.
 *
 * Architecture: GPT-Live is the voice (full duplex: listens while it
 * talks). It delegates thinking and tool use to a Responses backend model
 * ("Responses delegation"). Tool calls arrive in the browser over the WebRTC
 * data channel and are executed by *our* code — guest tools on the server
 * via /api/voice/tool (signed session token), staff tools through the same
 * agent endpoints the console uses (session auth, permission checks, signed
 * confirmation plans). The voice never touches the database directly.
 */
import OpenAI from 'openai';
import { createHmac, timingSafeEqual } from 'crypto';
import { forbidden, DomainError } from '../errors';

export const LIVE_MODEL = process.env.OPENAI_LIVE_MODEL || 'gpt-live-1';
// Same default the OpenAI playground uses for Live delegation.
export const VOICE_BACKEND_MODEL = process.env.OPENAI_VOICE_BACKEND_MODEL || 'gpt-6-luna';
// Built-in Live voices (marin first: the API default).
export const VOICES = ['marin', 'cedar', 'gleam', 'willow', 'coral', 'sage', 'verse', 'ash', 'shimmer', 'alloy', 'ballad', 'beacon', 'bossa', 'cinder', 'delta', 'echo', 'meridian', 'quartz', 'ripple', 'stone', 'tempo', 'vesper'] as const;

export function voiceConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!voiceConfigured()) throw new DomainError(503, 'VOICE_DISABLED', 'The voice agent isn’t connected yet — add OPENAI_API_KEY to turn it on.');
  // Fail fast enough to report a clean error inside the serverless function's time limit.
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
  return client;
}

export interface FunctionToolSpec {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
}

/** Events an untrusted browser may send on the data channel (no prompt rewrites). */
const ALLOWED_CLIENT_EVENTS = ['response.item.create', 'response.create', 'session.close', 'session.input_audio.mute', 'session.input_audio.unmute'];

export async function createLiveSession(input: {
  sdp: string;
  voice: string;
  instructions: string;
  backendInstructions: string;
  tools: FunctionToolSpec[];
}): Promise<{ sessionId: string; sdp: string }> {
  try {
    const live = await openai().live.create({
      session: {
        model: LIVE_MODEL,
        instructions: input.instructions,
        audio: { output: { voice: input.voice } },
        client: { data_channel: { allowed_client_events: ALLOWED_CLIENT_EVENTS } },
        delegation: {
          type: 'responses',
          responses: {
            model: VOICE_BACKEND_MODEL,
            instructions: input.backendInstructions,
            tools: input.tools,
            tool_choice: 'auto',
            parallel_tool_calls: false,
          },
        },
      },
      transport: { type: 'webrtc', sdp: input.sdp },
    });
    return { sessionId: live.session.id, sdp: live.transport.sdp };
  } catch (e) {
    if (e instanceof DomainError) throw e;
    const { status, reason } = describeOpenAIError(e, `${LIVE_MODEL} (voice) or ${VOICE_BACKEND_MODEL} (reasoning)`);
    console.error('GPT-Live session creation failed:', status, e instanceof Error ? e.message : e);
    // Staff-facing reason; the session route shows guests a gentler line.
    throw new DomainError(502, 'VOICE_UPSTREAM', reason, { status });
  }
}

/**
 * Turns an OpenAI failure into something a hotel owner can act on. OpenAI's
 * own message is included where it explains model access; never for auth
 * errors, whose message echoes part of the key.
 */
export function describeOpenAIError(e: unknown, model: string): { status: number | null; reason: string } {
  const clip = (s: string) => (s.length > 280 ? `${s.slice(0, 277)}…` : s);
  if (e instanceof OpenAI.APIConnectionError) return { status: null, reason: 'Couldn’t reach OpenAI just now — try again in a moment.' };
  if (!(e instanceof OpenAI.APIError)) return { status: null, reason: 'Couldn’t start the voice line just now. Please try again.' };
  const status = e.status ?? null;
  const detail = clip(String(e.message ?? '').replace(/sk-[A-Za-z0-9_*.-]+/g, 'sk-…'));
  switch (status) {
    case 401:
      return { status, reason: 'OpenAI didn’t accept the API key. Re-check OPENAI_API_KEY in Vercel (Settings → Environment Variables), then redeploy.' };
    case 403:
      return { status, reason: `OpenAI won’t let this key use ${model} yet — new models often need a verified organization or a higher usage tier. OpenAI says: ${detail}` };
    case 404:
      return { status, reason: `This OpenAI key doesn’t have access to ${model}. OpenAI says: ${detail}` };
    case 429:
      return e.code === 'insufficient_quota'
        ? { status, reason: 'The OpenAI account is out of credit — add billing at platform.openai.com, then try again.' }
        : { status, reason: 'OpenAI is rate-limiting this key right now — try again in a minute.' };
    case 400:
      return { status, reason: `OpenAI rejected the voice session setup. OpenAI says: ${detail}` };
    default:
      return { status, reason: `OpenAI returned an error${status ? ` (${status})` : ''}. ${detail}` };
  }
}

/** Setup check for the console: can this key use the voice and reasoning models? */
export async function checkVoiceModels(): Promise<{ model: string; role: string; ok: boolean; reason: string | null }[]> {
  const client = openai();
  return Promise.all(
    [
      { model: LIVE_MODEL, role: 'Voice' },
      { model: VOICE_BACKEND_MODEL, role: 'Reasoning & tools' },
    ].map(async ({ model, role }) => {
      try {
        await client.models.retrieve(model);
        return { model, role, ok: true, reason: null };
      } catch (e) {
        return { model, role, ok: false, reason: describeOpenAIError(e, model).reason };
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Voice session tokens: bind a browser to one voice session for tool calls.
// ---------------------------------------------------------------------------

export interface VoiceTokenPayload {
  sid: string; // VoiceSession id
  pid: string; // property
  aud: 'GUEST' | 'STAFF';
  uid: string | null;
  exp: number;
}

function secret(): string {
  const s = process.env.AGENT_PLAN_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET must be set to sign voice sessions.');
  return `voice:${s}`;
}

export function signVoiceToken(p: Omit<VoiceTokenPayload, 'exp'>, ttlMs = 30 * 60 * 1000): string {
  const body = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + ttlMs })).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyVoiceToken(token: string): VoiceTokenPayload {
  const [body, sig] = token.split('.');
  if (!body || !sig) throw forbidden('Voice session is invalid.');
  const expected = createHmac('sha256', secret()).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw forbidden('Voice session is invalid.');
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as VoiceTokenPayload;
  if (Date.now() > p.exp) throw forbidden('This voice session has ended. Start a new one.');
  return p;
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required, additionalProperties: false });
const date = (description: string) => ({ type: 'string', description: `${description} (YYYY-MM-DD)` });

export const GUEST_TOOLS: FunctionToolSpec[] = [
  {
    type: 'function',
    name: 'get_property_info',
    description: 'Hotel facts: description, amenities, address, phone, check-in/out times, cancellation policy, room types with base prices, and the hotel’s FAQ answers. Call before answering any question about the hotel.',
    parameters: obj({}, []),
    strict: true,
  },
  {
    type: 'function',
    name: 'check_availability',
    description: 'Live availability and exact prices for a stay. Always call this before quoting a price or saying a room is free.',
    parameters: obj(
      {
        check_in: date('Arrival date'),
        check_out: date('Departure date, after check_in'),
        guests: { type: 'integer', minimum: 1, maximum: 16 },
        rooms: { type: 'integer', minimum: 1, maximum: 9 },
      },
      ['check_in', 'check_out', 'guests', 'rooms']
    ),
    strict: true,
  },
  {
    type: 'function',
    name: 'start_booking',
    description: 'Open the secure checkout on the guest’s screen with the chosen room and dates pre-filled. The guest finishes booking there; never take card details by voice.',
    parameters: obj(
      {
        room_type_id: { type: 'string', description: 'id from check_availability' },
        check_in: date('Arrival date'),
        check_out: date('Departure date'),
        guests: { type: 'integer', minimum: 1, maximum: 16 },
        rooms: { type: 'integer', minimum: 1, maximum: 9 },
      },
      ['room_type_id', 'check_in', 'check_out', 'guests', 'rooms']
    ),
    strict: true,
  },
  {
    type: 'function',
    name: 'find_booking',
    description: 'Look up an existing reservation. Requires the 6–8 character confirmation code and the guest’s last name; both must match.',
    parameters: obj({ confirmation_code: { type: 'string' }, last_name: { type: 'string' } }, ['confirmation_code', 'last_name']),
    strict: true,
  },
  {
    type: 'function',
    name: 'leave_message',
    description: 'Pass a message or callback request to the hotel team (special requests, group bookings, anything you can’t resolve).',
    parameters: obj(
      {
        name: { type: 'string' },
        phone: { type: ['string', 'null'], description: 'Callback number if given' },
        email: { type: ['string', 'null'] },
        message: { type: 'string', description: 'What the guest needs, in one or two sentences' },
      },
      ['name', 'phone', 'email', 'message']
    ),
    strict: true,
  },
];

export const STAFF_TOOLS: FunctionToolSpec[] = [
  {
    type: 'function',
    name: 'front_desk',
    description:
      'Run a request against the hotel’s live systems and show the result on the staff member’s screen. Use plain imperative English the way the staff member said it, e.g. "who is arriving today", "check in Jordan Smith, quiet room on a high floor", "mark 204 clean", "raise Ocean King 10% next weekend". Reads return facts; changes come back as a plan that needs confirmation.',
    parameters: obj({ request: { type: 'string' } }, ['request']),
    strict: true,
  },
  {
    type: 'function',
    name: 'confirm_plan',
    description: 'Carry out the plan currently shown on screen. Only call after the staff member clearly says yes to that specific plan in this conversation.',
    parameters: obj({}, []),
    strict: true,
  },
  {
    type: 'function',
    name: 'dismiss_plan',
    description: 'Discard the plan currently shown on screen when the staff member says no or changes their mind.',
    parameters: obj({}, []),
    strict: true,
  },
];

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export function guestPrompts(p: { name: string; greeting?: string | null; houseRules?: string | null; today: string; timezone: string; handoffPhone?: string | null }) {
  const instructions = [
    `You are the voice of the front desk at ${p.name}. Warm, calm and brief — like a great hotel receptionist on the phone.`,
    p.greeting ? `Open with: "${p.greeting}"` : `Open with a short welcome to ${p.name} and ask how you can help.`,
    'Speak in short sentences. Say prices as natural amounts ("two hundred and twenty-seven dollars a night"). Repeat dates back before acting on them.',
    'Whenever the guest asks about rooms, prices, availability, policies, the hotel, or an existing booking, delegate — never answer facts from memory.',
    'If you are waiting on a result, say a brief natural filler ("let me check that for you").',
    'Never ask for card numbers. Bookings are completed on the guest’s screen.',
    p.handoffPhone ? `If the guest wants a person, offer to take a message or give the hotel number ${p.handoffPhone}.` : 'If the guest wants a person, offer to take a message for the team.',
  ].join('\n');
  const backendInstructions = [
    `You handle tasks for the voice front desk of ${p.name}. Today is ${p.today} (${p.timezone}). Resolve relative dates ("this Friday", "next weekend") against today.`,
    'Rules:',
    '- Facts come only from tools. Never invent prices, availability, amenities or policies.',
    '- Quote exact prices from check_availability. If nothing fits, say so and suggest other dates or a message to the team.',
    '- To book, call start_booking with the chosen room type; tell the guest the checkout has opened on their screen.',
    '- Existing bookings: find_booking needs the confirmation code and last name. Guests can change dates or cancel free until 3 PM the day before arrival on their booking page.',
    '- Anything you cannot do (group rates, complaints, special arrangements): leave_message with their name and callback details.',
    '- Reply with one or two short sentences for the voice to say.',
    p.houseRules ? `House rules from the hotel:\n${p.houseRules}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return { instructions, backendInstructions };
}

export function staffPrompts(p: { name: string; userName: string; role: string; today: string; timezone: string }) {
  const instructions = [
    `You are the hands-free assistant for ${p.userName} (${p.role.replace('_', ' ').toLowerCase()}) at ${p.name}. Brisk, friendly, professional.`,
    'Delegate every operational question or request. Results also appear on their screen, so summarise in one sentence instead of reading lists aloud.',
    'When a plan needs confirmation, read the plan title, ask "Shall I go ahead?", and wait for a clear yes before delegating the confirmation.',
    'If they say stop, cancel, or no, stop talking and delegate dismissing the plan.',
  ].join('\n');
  const backendInstructions = [
    `You operate ${p.name}'s systems for staff. Today is ${p.today} (${p.timezone}).`,
    '- Use front_desk for every read or change, passing the staff member’s request in plain words. Split multi-part requests into separate front_desk calls.',
    '- front_desk returns a summary and whether a plan is waiting. Plans never run on their own.',
    '- Call confirm_plan only after the staff member explicitly agrees to the pending plan; call dismiss_plan if they decline.',
    '- If front_desk asks a clarifying question, ask the staff member exactly that question.',
    '- Respond with one short sentence for the voice to say.',
  ].join('\n');
  return { instructions, backendInstructions };
}
