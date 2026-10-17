import { cn } from '@/lib/utils';

export const CHANNEL_NAMES: Record<string, string> = {
  EXPEDIA: 'Expedia',
  BOOKING_COM: 'Booking.com',
};

const CHANNEL_COLORS: Record<string, string> = {
  EXPEDIA: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  BOOKING_COM: 'bg-blue-100 text-blue-900 border-blue-300',
};

export function ChannelBadge({ channel, className }: { channel: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', CHANNEL_COLORS[channel], className)}>
      {CHANNEL_NAMES[channel] ?? channel}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONNECTED: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-red-100 text-red-700',
  // promotions / reservations / logs
  INACTIVE: 'bg-gray-100 text-gray-700',
  FAILED: 'bg-red-100 text-red-700',
  SUCCESS: 'bg-green-100 text-green-700',
  BOOKED: 'bg-green-100 text-green-700',
  MODIFIED: 'bg-indigo-100 text-indigo-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Setup started',
  CONNECTED: 'Verified - map rooms',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  return mode === 'LIVE' ? (
    <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Live</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-dashed border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-600">
      Sandbox
    </span>
  );
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return 'never';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

/** Reads a JSON API response, throwing the server's error message on failure */
export async function apiJson<T = any>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
