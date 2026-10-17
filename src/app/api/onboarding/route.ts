import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isDemoEmail } from '@/config/product';
import { badRequest, conflict, DomainError } from '@/server/errors';
import { handleRoute, json, parseJson } from '@/server/http';
import { VOICES } from '@/server/voice/live';
import { cloudLoginUrlIssue, pmsLoginUrlSchema } from '@/server/schemas';

const schema = z.object({
  path: z.enum(['FULL', 'BRIDGE', 'VOICE']).default('FULL'),
  account: z.object({
    firstName: z.string().trim().min(1, 'is required').max(60),
    lastName: z.string().trim().min(1, 'is required').max(60),
    email: z.string().trim().toLowerCase().email('must be a valid email').refine((v) => !isDemoEmail(v), 'belongs to the public demo — use your own email'),
    password: z.string().min(8, 'must be at least 8 characters').max(200),
  }),
  property: z.object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(['Hotel', 'Motel', 'Inn', 'B&B', 'Boutique', 'Other']).default('Hotel'),
    address: z.string().trim().min(3).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    zipCode: z.string().trim().min(2).max(20),
    phone: z.string().trim().min(5).max(40),
    tagline: z.string().trim().max(160).optional().nullable(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  }),
  roomTypes: z
    .array(z.object({ name: z.string().trim().min(2).max(80), capacity: z.coerce.number().int().min(1).max(20), basePrice: z.coerce.number().min(0).max(100000), totalRooms: z.coerce.number().int().min(0).max(2000) }))
    .max(8)
    .default([]),
  bridge: z.object({ system: z.string().trim().min(2).max(60), mode: z.enum(['DESKTOP', 'CLOUD']), loginUrl: pmsLoginUrlSchema }).optional(),
  voice: z.object({ voice: z.enum(VOICES).default('marin'), greeting: z.string().trim().max(300).optional().nullable(), handoffPhone: z.string().trim().max(40).optional().nullable() }).optional(),
});

/**
 * POST /api/onboarding — create the owner, their property and the setup for
 * the path they chose (run on HotelOne, keep their PMS, or voice only) in one
 * transaction. No payment data is collected here.
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const body = await parseJson(request, schema);
  const urlIssue = body.bridge ? cloudLoginUrlIssue(body.bridge.mode, body.bridge.loginUrl) : null;
  if (urlIssue) throw badRequest(urlIssue);
  // Sign-up is open, so cap new hotels per hour (shared across server instances).
  const recentSignups = await prisma.property.count({ where: { isDemo: false, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recentSignups >= Number(process.env.ONBOARDING_MAX_PER_HOUR || 30)) {
    throw new DomainError(429, 'RATE_LIMITED', 'Lots of hotels are signing up right now — please try again in a little while.');
  }
  if (await prisma.user.findUnique({ where: { email: body.account.email }, select: { id: true } })) {
    throw conflict('An account with this email already exists — sign in instead.');
  }
  const passwordHash = await bcrypt.hash(body.account.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { firstName: body.account.firstName, lastName: body.account.lastName, email: body.account.email, password: passwordHash, role: 'OWNER' },
    });
    const property = await tx.property.create({
      data: {
        name: body.property.name,
        type: body.property.type,
        address: body.property.address,
        city: body.property.city,
        state: body.property.state,
        zipCode: body.property.zipCode,
        phone: body.property.phone,
        tagline: body.property.tagline || null,
        primaryColor: body.property.primaryColor || null,
        amenities: [],
        isActive: true,
        isDemo: false,
        setupPath: body.path,
        // Hotels that keep their PMS start in the agent, where the bridge lives.
        interfaceMode: body.path === 'BRIDGE' ? 'AGENTIC' : 'CLASSIC',
      },
    });
    await tx.userPropertyAssignment.create({ data: { userId: user.id, propertyId: property.id } });
    for (const rt of body.roomTypes) {
      await tx.roomType.create({ data: { propertyId: property.id, name: rt.name, capacity: rt.capacity, basePrice: rt.basePrice, totalRooms: rt.totalRooms, amenities: [] } });
    }
    if (body.path === 'BRIDGE' && body.bridge) {
      await tx.pmsConnection.create({ data: { propertyId: property.id, system: body.bridge.system, mode: body.bridge.mode, loginUrl: body.bridge.loginUrl || null } });
    }
    // Every path gets the voice front desk configured (it's how VOICE hotels start).
    await tx.voiceAgentConfig.create({
      data: {
        propertyId: property.id,
        voice: body.voice?.voice ?? 'marin',
        greeting: body.voice?.greeting || `Thanks for calling ${body.property.name} — how can I help?`,
        handoffPhone: body.voice?.handoffPhone || body.property.phone,
        enabled: true,
        guestWidget: true,
      },
    });
    await tx.agentAuditLog.create({
      data: { propertyId: property.id, userId: user.id, action: 'ONBOARDED', detail: JSON.stringify({ source: 'classic', summary: `Set up ${property.name} (${body.path === 'FULL' ? 'full platform' : body.path === 'BRIDGE' ? `keeping ${body.bridge?.system ?? 'their PMS'}` : 'voice front desk'})` }) },
    });
    return { user, property };
  });

  const next = body.path === 'VOICE' ? '/admin/voice?welcome=1' : body.path === 'BRIDGE' ? '/admin/connect?welcome=1' : '/admin/dashboard?welcome=1';
  return json({ message: 'Onboarding complete', property: { id: result.property.id, name: result.property.name }, next }, { status: 201 });
});
