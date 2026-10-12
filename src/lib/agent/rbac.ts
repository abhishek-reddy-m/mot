/**
 * RBAC for the agentic (beta) interface.
 *
 * - Agent commands: staff only — ADMIN, OWNER, MANAGER, FRONT_DESK.
 *   Guests (CUSTOMER) and housekeepers never get command access.
 * - Interface-mode switch: ADMIN, OWNER, MANAGER only (front desk can
 *   USE the agent but cannot flip a property's mode).
 * - Non-admin staff are scoped to properties in their UserPropertyAssignment.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const AGENT_COMMAND_ROLES = ['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK'] as const;
export const MODE_SWITCH_ROLES = ['ADMIN', 'OWNER', 'MANAGER'] as const;

export interface AgentIdentity {
  userId: string;
  role: string;
  userName: string;
}

export class AgentForbidden extends Error {
  status = 403;
  constructor(message = 'Not authorized for the agent interface.') {
    super(message);
  }
}

export class AgentUnauthorized extends Error {
  status = 401;
  constructor(message = 'Sign in required.') {
    super(message);
  }
}

/**
 * Verifies the caller may act on `propertyId` for the given purpose.
 * Throws AgentUnauthorized / AgentForbidden on failure.
 */
export async function requirePropertyAccess(
  propertyId: string,
  purpose: 'command' | 'mode-switch'
): Promise<AgentIdentity> {
  const session = await auth();
  if (!session?.user?.id) throw new AgentUnauthorized();

  const allowed = purpose === 'command' ? AGENT_COMMAND_ROLES : MODE_SWITCH_ROLES;
  const role = (session.user as { role?: string }).role;
  if (!role || !(allowed as readonly string[]).includes(role)) {
    throw new AgentForbidden(
      purpose === 'command'
        ? 'The AI command interface is for staff only.'
        : 'Only owners and managers can switch interface mode.'
    );
  }

  if (role !== 'ADMIN') {
    const assignment = await prisma.userPropertyAssignment.findUnique({
      where: { userId_propertyId: { userId: session.user.id, propertyId } },
    });
    if (!assignment) throw new AgentForbidden('You are not assigned to this property.');
  } else {
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) throw new AgentForbidden('Property not found.');
  }

  return {
    userId: session.user.id,
    role,
    userName: session.user.name ?? session.user.email ?? 'staff',
  };
}

export async function logAgentAction(
  propertyId: string,
  userId: string,
  action: 'COMMAND' | 'MODE_SWITCH',
  detail: string
): Promise<void> {
  try {
    await prisma.agentAuditLog.create({
      data: { propertyId, userId, action, detail: detail.slice(0, 2000) },
    });
  } catch (e) {
    // Audit logging must never break the command itself.
    console.error('Agent audit log write failed:', e);
  }
}
