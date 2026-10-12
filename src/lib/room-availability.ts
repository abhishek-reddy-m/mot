/**
 * Back-compat wrappers around the inventory service
 * (src/server/services/inventory.ts), which is the single source of truth
 * for availability. Kept so existing routes keep their call signatures.
 */
import { prisma } from '@/lib/prisma';
import { nightlyInventory } from '@/server/services/inventory';
import { toISODate } from '@/server/dates';

export async function getAvailableRooms(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ availableRooms: number; availabilityByDate: { [key: string]: number } }> {
  try {
    const inv = await nightlyInventory(prisma, roomTypeId, toISODate(checkIn), toISODate(checkOut));
    const availabilityByDate: Record<string, number> = {};
    for (const [day, sold] of Object.entries(inv.soldByNight)) {
      availabilityByDate[day] = Math.max(0, inv.total - sold);
    }
    return { availableRooms: inv.minAvailable, availabilityByDate };
  } catch (error) {
    console.error('Error getting available rooms:', error);
    return { availableRooms: 0, availabilityByDate: {} };
  }
}

/**
 * @deprecated Availability is derived from bookings on every read, so there
 * is no counter to update. Retained as a no-op for older call sites.
 */
export async function updateRoomAvailability(
  _roomTypeId: string,
  _checkIn: Date,
  _checkOut: Date,
  _roomCount: number,
  _isCancel: boolean = false
): Promise<void> {
  return;
}
