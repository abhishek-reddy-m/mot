/**
 * Agent skills: reusable tools every agent can list and use.
 *
 * - ANSWER skills are facts to say (CONFIG ones are generated from hotel settings).
 * - MACRO skills are staff-agent shortcuts: commands with {param} placeholders.
 * - RECIPE skills are operator recipes (e.g. PMS-bridge steps) agents learned.
 *
 * A hotel's skills apply to that hotel; platform-wide skills (propertyId null)
 * apply everywhere, and a hotel skill with the same key overrides one. Only
 * ACTIVE skills are offered or usable. Authorisation (who may write a hotel's
 * skills) is the caller's job — these functions don't check the session.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DomainError, badRequest, forbidden, notFound } from '../errors';
import { ensureConfigSkills } from './config';
import { fillPlaceholders, placeholdersIn, validateSkillArgs } from './params';
import {
  skillBodySchemas,
  skillFieldsSchema,
  skillKey,
  skillKeySchema,
  skillParametersSchema,
  toSkill,
  type AgentAudience,
  type RecipeBody,
  type Skill,
  type SkillAudience,
  type SkillBody,
  type SkillKind,
  type SkillParameters,
  type SkillSource,
  type SkillStatus,
} from './types';

export * from './types';
export { syncConfigSkills, ensureConfigSkills, scheduleConfigSkillSync, type ConfigSyncResult } from './config';
export { validateSkillArgs, fillPlaceholders, placeholdersIn, type SkillArgs } from './params';

const audienceFilter = (audience?: AgentAudience) => (audience ? { audience: { in: [audience, 'ALL'] } } : {});
const ORDER = [{ uses: 'desc' }, { title: 'asc' }] satisfies Prisma.AgentSkillOrderByWithRelationInput[];

/** Keeps one skill per key, preferring the hotel's own over a platform-wide one. */
function preferHotel(rows: Skill[]): Skill[] {
  const byKey = new Map<string, Skill>();
  for (const s of rows) {
    const held = byKey.get(s.key);
    if (!held || (held.propertyId === null && s.propertyId !== null)) byKey.set(s.key, s);
  }
  return rows.filter((s) => byKey.get(s.key) === s);
}

/** Filters for `listSkills`. */
export interface ListSkillsOptions {
  /** Skills this agent may use (its audience or ALL). */
  audience?: AgentAudience;
  status?: SkillStatus[] | string[];
  kinds?: SkillKind[] | string[];
  /** Also include platform-wide skills (hotel skills override same-key ones). Ignored when propertyId is null. */
  includePlatform?: boolean;
}

/** A hotel's skills (or the platform-wide ones for null), most used first. */
export async function listSkills(propertyId: string | null, opts: ListSkillsOptions = {}): Promise<Skill[]> {
  const scope: Prisma.AgentSkillWhereInput = propertyId && opts.includePlatform ? { OR: [{ propertyId }, { propertyId: null }] } : { propertyId };
  const rows = await prisma.agentSkill.findMany({
    where: {
      ...scope,
      ...audienceFilter(opts.audience),
      ...(opts.status?.length ? { status: { in: [...opts.status] } } : {}),
      ...(opts.kinds?.length ? { kind: { in: [...opts.kinds] } } : {}),
    },
    orderBy: ORDER,
  });
  const skills = rows.map(toSkill);
  return propertyId && opts.includePlatform ? preferHotel(skills) : skills;
}

/** One entry of a skill catalog: what a model needs to pick and call a skill. */
export interface SkillCatalogEntry {
  key: string;
  title: string;
  description: string;
  kind: SkillKind;
  parameters: SkillParameters | null;
}

/**
 * The ACTIVE skills an agent may use at a hotel (its own plus platform-wide;
 * null = platform-wide only), most used first, for tool lists and prompts.
 * Generates the hotel's CONFIG skills on first use.
 */
export async function skillCatalog(propertyId: string | null, audience: AgentAudience, opts: { kinds?: SkillKind[] } = {}): Promise<SkillCatalogEntry[]> {
  if (propertyId) await ensureConfigSkills(propertyId);
  const skills = await listSkills(propertyId, { audience, status: ['ACTIVE'], kinds: opts.kinds, includePlatform: true });
  return skills.map((s) => ({ key: s.key, title: s.title, description: s.description, kind: s.kind, parameters: s.parameters }));
}

/**
 * `skillCatalog` as a short bullet list for a prompt, most used first,
 * capped at `maxChars` (default 2,500) with a "…and N more" line. One line per
 * skill: `- key: title [kind] — description Inputs: a (required), b.`
 * Empty string when there are none.
 */
export async function skillCatalogText(propertyId: string | null, audience: AgentAudience, opts: { kinds?: SkillKind[]; maxChars?: number } = {}): Promise<string> {
  const max = opts.maxChars ?? 2500;
  const entries = await skillCatalog(propertyId, audience, opts);
  const lines: string[] = [];
  let used = 0;
  for (const [i, s] of entries.entries()) {
    const required = new Set(s.parameters?.required ?? []);
    const inputs = Object.keys(s.parameters?.properties ?? {}).map((p) => (required.has(p) ? `${p} (required)` : p));
    let line = `- ${s.key}: ${s.title}${s.kind === 'ANSWER' ? '' : ` [${s.kind.toLowerCase()}]`} — ${s.description}${inputs.length ? ` Inputs: ${inputs.join(', ')}.` : ''}`;
    if (line.length > 300) line = `${line.slice(0, 299)}…`;
    // Keep room for the "…and N more" line unless this is the last skill.
    const more = entries.length - i - 1;
    if (used + line.length + (more > 0 ? 24 : 0) > max) {
      lines.push(`- …and ${entries.length - i} more.`);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

/** A skill by key: the hotel's own, else the platform-wide one (null = platform-wide only). Null when missing. */
export async function getSkill(propertyId: string | null, key: string): Promise<Skill | null> {
  const rows = await prisma.agentSkill.findMany({ where: { key, OR: propertyId ? [{ propertyId }, { propertyId: null }] : [{ propertyId: null }] }, take: 2 });
  const row = rows.find((r) => r.propertyId === propertyId) ?? rows.find((r) => r.propertyId === null);
  return row ? toSkill(row) : null;
}

/** A skill by id (for authorisation checks before setSkillStatus / deleteSkill). Null when missing. */
export async function getSkillById(id: string): Promise<Skill | null> {
  const row = await prisma.agentSkill.findUnique({ where: { id } });
  return row ? toSkill(row) : null;
}

/** What `useSkill` returns, by kind. MACRO/RECIPE text has {param} placeholders filled. */
export type UseSkillResult =
  | { kind: 'ANSWER'; key: string; title: string; answer: string }
  | { kind: 'MACRO'; key: string; title: string; steps: { command: string }[] }
  | { kind: 'RECIPE'; key: string; title: string; system: string; intent: string; steps: string[] };

/**
 * Uses a skill: ANSWER → its answer; MACRO → its commands with placeholders
 * filled from `args` (checked against its parameters); RECIPE → system,
 * intent and steps, filled the same way. Counts the use. DomainError 404
 * (unknown key), 409 SKILL_INACTIVE (suggested or disabled), 403 (another
 * audience's skill) or 400 (bad arguments).
 */
export async function useSkill(propertyId: string | null, key: string, args: unknown, ctx: { audience: AgentAudience }): Promise<UseSkillResult> {
  const skill = await getSkill(propertyId, key);
  if (!skill) throw notFound(`Skill "${key}"`);
  if (skill.status !== 'ACTIVE') throw new DomainError(409, 'SKILL_INACTIVE', `The skill "${key}" isn’t active${skill.status === 'SUGGESTED' ? ' yet — a manager needs to approve it' : ''}.`);
  if (skill.audience !== 'ALL' && skill.audience !== ctx.audience) throw forbidden(`The skill "${key}" is for ${skill.audience.toLowerCase()} agents.`);
  let result: UseSkillResult;
  if (skill.kind === 'ANSWER') {
    result = { kind: 'ANSWER', key: skill.key, title: skill.title, answer: skill.body.answer };
  } else {
    const values = validateSkillArgs(key, skill.parameters, args);
    const fill = (t: string) => fillPlaceholders(key, t, values);
    result =
      skill.kind === 'MACRO'
        ? { kind: 'MACRO', key: skill.key, title: skill.title, steps: skill.body.steps.map((s) => ({ command: fill(s.command) })) }
        : { kind: 'RECIPE', key: skill.key, title: skill.title, system: skill.body.system, intent: fill(skill.body.intent), steps: skill.body.steps.map(fill) };
  }
  await prisma.agentSkill.update({ where: { id: skill.id }, data: { uses: { increment: 1 }, lastUsedAt: new Date() } });
  return result;
}

// ---------------------------------------------------------------------------
// Writing skills
// ---------------------------------------------------------------------------

/** Input for `upsertSkill` / `recordLearnedSkill`. */
export interface UpsertSkillInput {
  /** Null for a platform-wide skill. */
  propertyId: string | null;
  /** Slug; derived from the title when omitted. */
  key?: string;
  title: string;
  description: string;
  kind: SkillKind;
  /** Default ALL on create. */
  audience?: SkillAudience;
  parameters?: SkillParameters | null;
  body: SkillBody;
  /** Default MANUAL (editing a CONFIG skill makes it MANUAL, so syncs leave it alone). */
  source?: SkillSource;
  /** Default ACTIVE on create; unchanged on update when omitted. */
  status?: SkillStatus;
  createdById?: string | null;
}

/** Validates a skill write; DomainError 400 with every problem. */
function validated(input: UpsertSkillInput) {
  const key = input.key?.trim() || skillKey(input.title);
  const problems: string[] = [];
  const keyCheck = skillKeySchema.safeParse(key);
  if (!keyCheck.success) problems.push(`key ${keyCheck.error.issues[0].message}`);
  const fields = skillFieldsSchema.safeParse(input);
  if (!fields.success) problems.push(...fields.error.issues.map((i) => `${i.path.join('.')} ${i.message}`));
  const kind = fields.success ? fields.data.kind : input.kind;
  const bodySchema = skillBodySchemas[kind as SkillKind];
  const body = bodySchema?.safeParse(input.body);
  if (!body?.success) problems.push(...(body?.error.issues ?? []).map((i) => `body.${i.path.join('.')} ${i.message}`));
  const params = input.parameters ? skillParametersSchema.safeParse(input.parameters) : null;
  if (params && !params.success) problems.push(...params.error.issues.map((i) => `parameters.${i.path.join('.')} ${i.message}`));
  if (problems.length || !fields.success || !body?.success) throw badRequest(`Invalid skill: ${problems.join('; ')}.`);
  const parameters = params?.success ? (params.data as SkillParameters) : null;
  const undeclared = placeholdersIn(kind, body.data as SkillBody).filter((p) => !parameters?.properties[p]);
  if (undeclared.length) throw badRequest(`Invalid skill: placeholders ${undeclared.map((p) => `{${p}}`).join(', ')} need matching parameters.`);
  return { key, fields: fields.data, body: body.data as SkillBody, parameters };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Creates or updates a skill by (propertyId, key). DomainError 400 for an
 * invalid key, fields, body (per kind) or parameters, or placeholders without
 * a matching parameter.
 */
export async function upsertSkill(input: UpsertSkillInput): Promise<Skill> {
  const v = validated(input);
  const existing = await prisma.agentSkill.findFirst({ where: { propertyId: input.propertyId, key: v.key } });
  const data = {
    title: v.fields.title,
    description: v.fields.description,
    kind: v.fields.kind,
    body: json(v.body),
    parameters: v.parameters ? json(v.parameters) : Prisma.DbNull,
  };
  if (existing) {
    const row = await prisma.agentSkill.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(v.fields.audience ? { audience: v.fields.audience } : {}),
        ...(v.fields.status ? { status: v.fields.status } : {}),
        source: v.fields.source ?? (existing.source === 'CONFIG' ? 'MANUAL' : existing.source),
      },
    });
    return toSkill(row);
  }
  try {
    const row = await prisma.agentSkill.create({
      data: { ...data, propertyId: input.propertyId, key: v.key, audience: v.fields.audience ?? 'ALL', status: v.fields.status ?? 'ACTIVE', source: v.fields.source ?? 'MANUAL', createdById: input.createdById ?? null },
    });
    return toSkill(row);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new DomainError(409, 'CONFLICT', `A skill with the key "${v.key}" was just created — try again.`);
    throw e;
  }
}

/** Approves (ACTIVE), suggests or disables a skill. DomainError 404 when missing. */
export async function setSkillStatus(id: string, status: SkillStatus): Promise<Skill> {
  const s = skillFieldsSchema.shape.status.unwrap().safeParse(status);
  if (!s.success) throw badRequest('Status must be ACTIVE, SUGGESTED or DISABLED.');
  const row = await prisma.agentSkill.update({ where: { id }, data: { status: s.data } }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw notFound('Skill');
    throw e;
  });
  return toSkill(row);
}

/**
 * Deletes a skill and returns it. CONFIG skills come back on the next
 * settings sync — disable them instead. DomainError 404 when missing.
 */
export async function deleteSkill(id: string): Promise<Skill> {
  const row = await prisma.agentSkill.delete({ where: { id } }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw notFound('Skill');
    throw e;
  });
  return toSkill(row);
}

/** Input for `recordLearnedSkill`: a skill an agent worked out, ACTIVE or SUGGESTED (awaiting approval). */
export type LearnedSkillInput = Omit<UpsertSkillInput, 'source' | 'status'> & { status: 'ACTIVE' | 'SUGGESTED' };

/**
 * Records a skill an agent learned (source LEARNED), upserting by key. A key
 * held by a CONFIG or MANUAL skill gets a numbered variant ("late-checkout-2")
 * instead of overwriting it. Re-learning never revives a skill someone
 * disabled, and never demotes an ACTIVE one to SUGGESTED.
 */
export async function recordLearnedSkill(input: LearnedSkillInput): Promise<Skill> {
  const base = input.key?.trim() || skillKey(input.title);
  let key = base;
  let existing = await prisma.agentSkill.findFirst({ where: { propertyId: input.propertyId, key } });
  for (let i = 2; existing && existing.source !== 'LEARNED' && i < 50; i++) {
    key = `${base.slice(0, 76)}-${i}`;
    existing = await prisma.agentSkill.findFirst({ where: { propertyId: input.propertyId, key } });
  }
  if (existing && existing.source !== 'LEARNED') throw new DomainError(409, 'CONFLICT', `Too many skills share the key "${base}".`);
  const status: SkillStatus = existing?.status === 'DISABLED' ? 'DISABLED' : existing?.status === 'ACTIVE' ? 'ACTIVE' : input.status;
  return upsertSkill({ ...input, key, source: 'LEARNED', status });
}

/**
 * Counts a RECIPE run's outcome in its body (successes / failures), so
 * agents can prefer recipes that work. DomainError 404 / 400 (not a recipe).
 */
export async function recordRecipeOutcome(propertyId: string | null, key: string, success: boolean): Promise<Skill> {
  const skill = await getSkill(propertyId, key);
  if (!skill) throw notFound(`Skill "${key}"`);
  if (skill.kind !== 'RECIPE') throw badRequest(`The skill "${key}" isn’t a recipe.`);
  const body: RecipeBody = { ...skill.body, successes: (skill.body.successes ?? 0) + (success ? 1 : 0), failures: (skill.body.failures ?? 0) + (success ? 0 : 1) };
  const row = await prisma.agentSkill.update({ where: { id: skill.id }, data: { body: json(body), lastUsedAt: new Date() } });
  return toSkill(row);
}
