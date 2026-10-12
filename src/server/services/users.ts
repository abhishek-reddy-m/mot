/**
 * Team/user management rules: visibility and what an actor may grant.
 */
import type { Prisma } from '@prisma/client';
import type { Actor } from '../authz';
import { forbidden } from '../errors';

export const ROLES = ['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER', 'CUSTOMER'] as const;
export type Role = (typeof ROLES)[number];

export const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  assignedProperties: { include: { property: { select: { id: true, name: true } } } },
  _count: { select: { bookings: true } },
} satisfies Prisma.UserSelect;

/** Users the actor may see: everyone for admins; otherwise staff on, and guests of, their properties. */
export function visibleUsersWhere(actor: Actor): Prisma.UserWhereInput {
  if (actor.propertyIds === 'ALL') return {};
  const ids = actor.propertyIds;
  return {
    OR: [
      { assignedProperties: { some: { propertyId: { in: ids } } } },
      { role: 'CUSTOMER', bookings: { some: { propertyId: { in: ids } } } },
    ],
  };
}

/** Roles the actor may grant. Only platform admins can create admins. */
export function assertCanGrant(actor: Actor, role: Role) {
  if (actor.role === 'ADMIN') return;
  if (role === 'ADMIN') throw forbidden('Only platform admins can grant admin access.');
  if (role === 'CUSTOMER') throw forbidden('Guest accounts are created by guests themselves.');
}

export function assertAssignable(actor: Actor, propertyIds: string[]) {
  if (actor.propertyIds === 'ALL') return;
  const own = actor.propertyIds;
  const foreign = propertyIds.filter((id) => !own.includes(id));
  if (foreign.length) throw forbidden('You can only assign people to your own properties.');
}

