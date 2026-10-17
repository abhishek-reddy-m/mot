/**
 * Tools the channel agent can call. Read tools run immediately; write tools
 * (anything that changes prices, restrictions or promotions) produce a
 * preview first so the admin can approve or reject them.
 *
 * Schemas are hand-written for strict tool use, which doesn't support
 * numeric/length constraints - those limits are enforced by the services.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toDateString } from '@/lib/date-utils';
import { WEEKDAYS } from '@/lib/channel-manager/dates';
import {
  ADJUSTMENT_TYPES,
  applyMarkup,
  applyRateChange,
  applyRestrictions,
  getChannelCalendar,
  previewMarkup,
  previewRateChange,
  previewRestrictions,
} from '@/lib/channel-manager/rates';
import {
  createPromotion,
  PromotionChanges,
  serializePromotion,
  updatePromotion,
  validatePromotion,
} from '@/lib/channel-manager/promotions';
import { pullReservations } from '@/lib/channel-manager/reservations';
import {
  createPromotionSchema,
  markupSchema,
  rateChangeSchema,
  restrictionSchema,
  updatePromotionSchema,
  zodMessage,
} from '@/lib/channel-manager/schemas';
import { errorMessage, pushAri } from '@/lib/channel-manager/sync';
import { CHANNEL_LABELS, ChannelApiError } from '@/lib/channel-manager/types';

// ---------------------------------------------------------------------------
// JSON schema helpers
// ---------------------------------------------------------------------------

const string = (description: string) => ({ type: 'string', description });
const date = (description: string) => ({ type: 'string', format: 'date', description });
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
const ids = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
const weekdays = {
  type: 'array',
  items: { type: 'string', enum: [...WEEKDAYS] },
  description: 'Nights of the week to change; empty array = every night',
};
function object(properties: Record<string, unknown>): Anthropic.Beta.BetaTool.InputSchema {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
const reason = string('One short sentence on why, as the admin asked it (kept in the audit log)');

export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'list_channel_connections',
    description:
      'Lists every property with its Expedia / Booking.com connections: connection IDs, status, sandbox/live mode, default markup, ' +
      'sync settings and the mapped room types (PMS room type IDs and names, per-room markup and channel allocation). ' +
      'Call this first to get the IDs other tools need.',
    input_schema: object({}),
  },
  {
    name: 'get_channel_calendar',
    description:
      'Day-by-day view for one channel connection: PMS rate, price sent to the channel, channel-specific override, rooms available, ' +
      'booked, stop-sell, minimum stay and active promotions. Max 93 days per call.',
    input_schema: object({
      connectionId: string('Channel connection ID'),
      startDate: date('First night (YYYY-MM-DD)'),
      endDate: date('Last night, inclusive (YYYY-MM-DD)'),
      roomTypeId: nullable(string('Limit to one PMS room type; null = all mapped room types')),
    }),
  },
  {
    name: 'list_promotions',
    description: 'Lists promotions with their IDs, discount, stay/booking windows, room types and status.',
    input_schema: object({
      connectionId: nullable(string('Only this connection; null = all connections')),
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'FAILED', 'ALL'] },
    }),
  },
  {
    name: 'get_recent_activity',
    description: 'Recent sync log entries (pushes, errors) and OTA reservations received.',
    input_schema: object({
      connectionId: nullable(string('Only this connection; null = all connections')),
      limit: { type: 'integer', description: 'Entries of each kind to return (1-50)' },
    }),
  },
  {
    name: 'sync_channels',
    description:
      'Re-sends current availability, rates and restrictions to the OTAs and optionally pulls new OTA reservations. ' +
      'Does not change any prices - use it when the admin asks to resync or after fixing a failed push.',
    input_schema: object({
      connectionIds: ids('Connections to sync; empty array = every active connection'),
      pullReservations: { type: 'boolean', description: 'Also fetch new reservations from the OTAs' },
    }),
  },
  {
    name: 'update_rates',
    description:
      'Changes prices for a date range. scope "channel" sets channel-specific prices on the given OTA connections only ' +
      '(relative changes start from the price currently sent to that channel); scope "all_channels_and_direct" changes the PMS rate ' +
      'that the website uses and every channel derives from (needs roomTypeIds or propertyId). ' +
      'adjustment.type reset_to_pms_rate (scope "channel" only, value null) removes channel-specific prices. ' +
      'Prices are per room per night.',
    input_schema: object({
      scope: { type: 'string', enum: ['channel', 'all_channels_and_direct'] },
      connectionIds: ids('Channel connection IDs (scope "channel"); empty array for "all_channels_and_direct"'),
      propertyId: nullable(string('Property whose room types change when roomTypeIds is empty (scope "all_channels_and_direct")')),
      roomTypeIds: ids('PMS room type IDs; empty array = all mapped room types (channel) / all room types of the property (direct)'),
      startDate: date('First night (YYYY-MM-DD)'),
      endDate: date('Last night, inclusive (YYYY-MM-DD)'),
      daysOfWeek: weekdays,
      adjustment: object({
        type: { type: 'string', enum: [...ADJUSTMENT_TYPES] },
        value: nullable({ type: 'number', description: 'Price in the connection currency, percent, or amount; null for reset_to_pms_rate' }),
      }),
      reason,
    }),
  },
  {
    name: 'set_restrictions',
    description:
      'Stop-sell (close) or reopen dates, and/or set a minimum stay, on OTA connections. minStay 1 clears the minimum stay. ' +
      'Use null for whichever of closed / minStay should stay unchanged.',
    input_schema: object({
      connectionIds: ids('Channel connection IDs'),
      roomTypeIds: ids('PMS room type IDs; empty array = all mapped room types'),
      startDate: date('First night (YYYY-MM-DD)'),
      endDate: date('Last night, inclusive (YYYY-MM-DD)'),
      daysOfWeek: weekdays,
      closed: nullable({ type: 'boolean', description: 'true = stop sell, false = open' }),
      minStay: nullable({ type: 'integer', description: 'Minimum nights (1-30)' }),
      reason,
    }),
  },
  {
    name: 'set_channel_markup',
    description:
      'Sets the markup percentage added to the PMS rate for one connection - either the connection default (roomTypeId null) or ' +
      'one room type. Re-pushes prices for the whole sync window.',
    input_schema: object({
      connectionId: string('Channel connection ID'),
      roomTypeId: nullable(string('PMS room type ID, or null for the connection default')),
      markupPercent: { type: 'number', description: 'Percent between -50 and 100' },
      reason,
    }),
  },
  {
    name: 'create_promotion',
    description:
      'Creates a promotion (percentage discount) on one or more OTA connections. Types: BASIC (plain deal), ' +
      'EARLY_BOOKER (needs minDaysInAdvance), LAST_MINUTE (needs maxDaysInAdvance, 1-30), MULTI_NIGHT (needs minStay >= 2). ' +
      'Use null for fields that do not apply.',
    input_schema: object({
      connectionIds: ids('Channel connection IDs to publish on'),
      name: string('Short promotion name shown in the OTA extranet'),
      type: { type: 'string', enum: ['BASIC', 'EARLY_BOOKER', 'LAST_MINUTE', 'MULTI_NIGHT'] },
      discountPercent: { type: 'number', description: 'Discount percent (1-80)' },
      stayStart: date('First stay night (YYYY-MM-DD)'),
      stayEnd: date('Last stay night, inclusive (YYYY-MM-DD)'),
      bookStart: nullable(date('Bookable from (YYYY-MM-DD)')),
      bookEnd: nullable(date('Bookable until (YYYY-MM-DD)')),
      minStay: nullable({ type: 'integer', description: 'Minimum nights' }),
      minDaysInAdvance: nullable({ type: 'integer', description: 'EARLY_BOOKER: book at least this many days ahead' }),
      maxDaysInAdvance: nullable({ type: 'integer', description: 'LAST_MINUTE: book at most this many days ahead' }),
      roomTypeIds: ids('PMS room type IDs; empty array = all mapped room types'),
      reason,
    }),
  },
  {
    name: 'update_promotion',
    description:
      'Edits, pauses (active false) or resumes (active true) an existing promotion. Use null for every field that should stay unchanged.',
    input_schema: object({
      promotionId: string('Promotion ID from list_promotions'),
      name: nullable({ type: 'string' }),
      discountPercent: nullable({ type: 'number' }),
      stayStart: nullable(date('First stay night')),
      stayEnd: nullable(date('Last stay night, inclusive')),
      bookStart: nullable(date('Bookable from')),
      bookEnd: nullable(date('Bookable until')),
      minStay: nullable({ type: 'integer' }),
      active: nullable({ type: 'boolean' }),
      reason,
    }),
  },
].map((tool) => ({ ...tool, strict: true }));

/** Tools that change prices, restrictions or promotions */
export const WRITE_TOOLS = new Set([
  'update_rates',
  'set_restrictions',
  'set_channel_markup',
  'create_promotion',
  'update_promotion',
]);

export const TOOL_LABELS: Record<string, string> = {
  list_channel_connections: 'Looked up channel connections',
  get_channel_calendar: 'Checked the channel calendar',
  list_promotions: 'Listed promotions',
  get_recent_activity: 'Checked recent sync activity',
  sync_channels: 'Synced channels',
  update_rates: 'Change rates',
  set_restrictions: 'Change restrictions',
  set_channel_markup: 'Change markup',
  create_promotion: 'Create promotion',
  update_promotion: 'Update promotion',
};

export interface ActionPreview {
  title: string;
  summary: string;
  details: string[];
  warnings: string[];
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ChannelApiError(`Invalid tool input - ${zodMessage(result.error)}`);
  return result.data;
}

const calendarInput = z.object({
  connectionId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  roomTypeId: z.string().nullable(),
});
const promotionsInput = z.object({
  connectionId: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED', 'ALL']),
});
const activityInput = z.object({ connectionId: z.string().nullable(), limit: z.number().int() });
const syncInput = z.object({ connectionIds: z.array(z.string()), pullReservations: z.boolean() });
const reasonOf = (input: unknown) =>
  typeof (input as { reason?: unknown })?.reason === 'string' ? (input as { reason: string }).reason : null;

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function range(min: number, max: number) {
  return min === max ? money(min) : `${money(min)}-${money(max)}`;
}

async function promotionTargets(connectionIds: string[]): Promise<string[]> {
  const connections = await prisma.channelConnection.findMany({
    where: { id: { in: connectionIds } },
    select: { id: true, channel: true, status: true, property: { select: { name: true } } },
  });
  for (const id of connectionIds) {
    if (!connections.some((c) => c.id === id)) throw new ChannelApiError(`Channel connection ${id} not found`);
  }
  return connections.map((c) => `${CHANNEL_LABELS[c.channel]} (${c.property.name})`);
}

// ---------------------------------------------------------------------------
// Previews (write tools)
// ---------------------------------------------------------------------------

/** Dry run of a write tool. Throws ChannelApiError when the input is invalid. */
export async function previewTool(name: string, input: unknown): Promise<ActionPreview> {
  const reason = reasonOf(input);
  switch (name) {
    case 'update_rates': {
      const plan = await previewRateChange(parse(rateChangeSchema, input));
      if (plan.cellCount === 0) throw new ChannelApiError(`Nothing would change: ${plan.warnings.join('; ')}`);
      return {
        title: 'Change rates',
        summary: plan.summary,
        details: plan.groups.map(
          (g) =>
            `${g.target} - ${g.roomTypeName}: ${g.dates} night(s) ${g.firstDate} to ${g.lastDate}, ` +
            `${range(g.oldMin, g.oldMax)} -> ${range(g.newMin, g.newMax)}`
        ),
        warnings: plan.warnings,
        reason,
      };
    }
    case 'set_restrictions': {
      const plan = await previewRestrictions(parse(restrictionSchema, input));
      if (plan.cellCount === 0) throw new ChannelApiError(`Nothing would change: ${plan.warnings.join('; ')}`);
      return { title: 'Change restrictions', summary: plan.summary, details: plan.targets, warnings: plan.warnings, reason };
    }
    case 'set_channel_markup': {
      const plan = await previewMarkup(parse(markupSchema, input));
      return { title: 'Change markup', summary: plan.summary, details: plan.affectedRoomTypes, warnings: plan.warnings, reason };
    }
    case 'create_promotion': {
      const { connectionIds, ...promotion } = parse(createPromotionSchema, input);
      validatePromotion(promotion);
      const targets = await promotionTargets(connectionIds);
      const details = [
        `Stays ${promotion.stayStart} to ${promotion.stayEnd}`,
        promotion.bookStart || promotion.bookEnd
          ? `Bookable ${promotion.bookStart ?? 'now'} to ${promotion.bookEnd ?? 'end of stay window'}`
          : null,
        promotion.minStay ? `Minimum stay ${promotion.minStay} nights` : null,
        promotion.minDaysInAdvance ? `Book at least ${promotion.minDaysInAdvance} days ahead` : null,
        promotion.maxDaysInAdvance ? `Book at most ${promotion.maxDaysInAdvance} days ahead` : null,
        promotion.roomTypeIds.length > 0 ? `${promotion.roomTypeIds.length} room type(s)` : 'All mapped room types',
      ].filter((line): line is string => line !== null);
      return {
        title: 'Create promotion',
        summary: `${promotion.type.replace('_', ' ').toLowerCase()} promotion "${promotion.name}" (-${promotion.discountPercent}%) on ${targets.join(', ')}`,
        details,
        warnings: [],
        reason,
      };
    }
    case 'update_promotion': {
      const { promotionId, active, ...fields } = parse(updatePromotionSchema, input);
      const promotion = await prisma.channelPromotion.findUnique({
        where: { id: promotionId },
        include: { connection: { select: { channel: true } } },
      });
      if (!promotion) throw new ChannelApiError(`Promotion ${promotionId} not found`);
      const current = serializePromotion(promotion);
      const changes = Object.entries(fields)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => `${key}: ${String(current[key as keyof typeof current] ?? '-')} -> ${String(value)}`);
      if (active !== null) changes.push(active ? 'Resume (active)' : 'Pause (inactive)');
      if (changes.length === 0) throw new ChannelApiError('No changes given - set at least one field');
      return {
        title: 'Update promotion',
        summary: `${CHANNEL_LABELS[promotion.connection.channel]} promotion "${promotion.name}"`,
        details: changes,
        warnings: [],
        reason,
      };
    }
    default:
      throw new ChannelApiError(`${name} is not a write tool`);
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function listConnections() {
  const properties = await prisma.property.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      roomTypes: { where: { isActive: true }, select: { id: true, name: true, basePrice: true, totalRooms: true } },
      channelConnections: {
        include: {
          roomMappings: { include: { roomType: { select: { name: true } } } },
          _count: { select: { promotions: { where: { status: 'ACTIVE' } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  return properties.map((property) => ({
    propertyId: property.id,
    property: property.name,
    roomTypes: property.roomTypes.map((rt) => ({
      roomTypeId: rt.id,
      name: rt.name,
      basePrice: Number(rt.basePrice),
      totalRooms: rt.totalRooms,
    })),
    connections: property.channelConnections.map((c) => ({
      connectionId: c.id,
      channel: CHANNEL_LABELS[c.channel],
      status: c.status,
      mode: c.mode,
      currency: c.currency,
      defaultMarkupPercent: Number(c.defaultMarkupPercent),
      syncRates: c.syncRates,
      syncAvailability: c.syncAvailability,
      lastAriSyncAt: c.lastAriSyncAt,
      lastError: c.lastError,
      activePromotions: c._count.promotions,
      mappedRoomTypes: c.roomMappings
        .filter((m) => m.isActive)
        .map((m) => ({
          roomTypeId: m.roomTypeId,
          name: m.roomType.name,
          otaRoomType: m.otaRoomTypeName ?? m.otaRoomTypeId,
          otaRatePlan: m.otaRatePlanName ?? m.otaRatePlanId,
          markupPercent: m.markupPercent === null ? null : Number(m.markupPercent),
          channelAllocation: m.inventoryAllocation,
        })),
    })),
  }));
}

async function recentActivity(connectionId: string | null, limit: number) {
  const take = Math.min(Math.max(limit, 1), 50);
  const where = connectionId ? { connectionId } : {};
  const [logs, reservations] = await Promise.all([
    prisma.channelSyncLog.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: { connection: { select: { channel: true } } },
    }),
    prisma.channelReservation.findMany({
      where,
      take,
      orderBy: { receivedAt: 'desc' },
      include: {
        connection: { select: { channel: true } },
        booking: { select: { checkIn: true, checkOut: true, status: true, roomType: { select: { name: true } } } },
      },
    }),
  ]);
  return {
    syncLog: logs.map((log) => ({
      at: log.createdAt,
      channel: CHANNEL_LABELS[log.connection.channel],
      action: log.action,
      status: log.status,
      message: log.message,
    })),
    reservations: reservations.map((r) => ({
      receivedAt: r.receivedAt,
      channel: CHANNEL_LABELS[r.connection.channel],
      otaReservation: r.externalId,
      status: r.status,
      guest: r.guestName,
      total: r.totalAmount === null ? null : Number(r.totalAmount),
      roomType: r.booking?.roomType.name ?? null,
      checkIn: r.booking ? toDateString(r.booking.checkIn) : null,
      checkOut: r.booking ? toDateString(r.booking.checkOut) : null,
    })),
  };
}

async function syncChannels(connectionIds: string[], pull: boolean) {
  const targets =
    connectionIds.length > 0
      ? connectionIds
      : (await prisma.channelConnection.findMany({ where: { status: { in: ['ACTIVE', 'ERROR'] } }, select: { id: true } })).map(
          (c) => c.id
        );
  const results = [];
  for (const id of targets) {
    const result: Record<string, unknown> = { connectionId: id };
    try {
      result.ari = (await pushAri(id)).message;
    } catch (error) {
      result.ariError = errorMessage(error);
    }
    if (pull) {
      try {
        result.reservations = await pullReservations(id);
      } catch (error) {
        result.reservationError = errorMessage(error);
      }
    }
    results.push(result);
  }
  return { synced: results.length, results };
}

/** Runs a tool and returns a JSON-serializable result. Throws on invalid input or failure. */
export async function executeTool(name: string, input: unknown, actor: string): Promise<unknown> {
  switch (name) {
    case 'list_channel_connections':
      return listConnections();
    case 'get_channel_calendar': {
      const { connectionId, startDate, endDate, roomTypeId } = parse(calendarInput, input);
      return getChannelCalendar(connectionId, startDate, endDate, roomTypeId);
    }
    case 'list_promotions': {
      const { connectionId, status } = parse(promotionsInput, input);
      const promotions = await prisma.channelPromotion.findMany({
        where: { ...(connectionId ? { connectionId } : {}), ...(status !== 'ALL' ? { status } : {}) },
        include: { connection: { select: { channel: true, property: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return promotions.map((p) => ({
        ...serializePromotion(p),
        channel: `${CHANNEL_LABELS[p.connection.channel]} (${p.connection.property.name})`,
      }));
    }
    case 'get_recent_activity': {
      const { connectionId, limit } = parse(activityInput, input);
      return recentActivity(connectionId, limit);
    }
    case 'sync_channels': {
      const { connectionIds, pullReservations: pull } = parse(syncInput, input);
      return syncChannels(connectionIds, pull);
    }
    case 'update_rates':
      return applyRateChange(parse(rateChangeSchema, input), actor);
    case 'set_restrictions':
      return applyRestrictions(parse(restrictionSchema, input), actor);
    case 'set_channel_markup':
      return applyMarkup(parse(markupSchema, input));
    case 'create_promotion': {
      const { connectionIds, ...promotion } = parse(createPromotionSchema, input);
      const created = [];
      for (const connectionId of connectionIds) {
        const result = await createPromotion(connectionId, promotion, actor);
        created.push({ ...serializePromotion(result), pushedToOta: result.status === 'ACTIVE' });
      }
      return { promotions: created };
    }
    case 'update_promotion': {
      const { promotionId, active, ...fields } = parse(updatePromotionSchema, input);
      const changes: PromotionChanges = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
      if (active !== null) changes.active = active;
      const result = await updatePromotion(promotionId, changes);
      return { ...serializePromotion(result), pushedToOta: result.status !== 'FAILED' };
    }
    default:
      throw new ChannelApiError(`Unknown tool ${name}`);
  }
}
