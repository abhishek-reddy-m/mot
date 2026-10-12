import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { BookingStatus, HousekeepingStatus, Occupancy, RoomStatus } from '@/lib/dto';
import { BOOKING_STATUS, HOUSEKEEPING_STATUS, OCCUPANCY, ROOM_STATUS, paymentLabel, type Tone } from '@/lib/status';

const variant = (tone: Tone): BadgeProps['variant'] => tone;

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const s = BOOKING_STATUS[status];
  return (
    <Badge variant={variant(s.tone)} dot className={className}>
      {s.label}
    </Badge>
  );
}

export function RoomStatusBadge({ status, className }: { status: RoomStatus; className?: string }) {
  const s = ROOM_STATUS[status];
  return (
    <Badge variant={variant(s.tone)} dot className={className}>
      {s.label}
    </Badge>
  );
}

export function OccupancyBadge({ occupancy, className }: { occupancy: Occupancy; className?: string }) {
  const s = OCCUPANCY[occupancy];
  return (
    <Badge variant={variant(s.tone)} className={className}>
      {s.label}
    </Badge>
  );
}

export function TaskStatusBadge({ status, className }: { status: HousekeepingStatus; className?: string }) {
  const s = HOUSEKEEPING_STATUS[status];
  return (
    <Badge variant={variant(s.tone)} dot className={className}>
      {s.label}
    </Badge>
  );
}

export function PaymentBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const s = paymentLabel(status);
  return (
    <Badge variant={variant(s.tone)} className={className}>
      {s.label}
    </Badge>
  );
}
