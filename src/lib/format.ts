/**
 * Client-safe formatting for calendar days (YYYY-MM-DD) and money.
 * Calendar days are rendered in UTC so they never shift with the viewer's
 * timezone (a stay on Oct 12 is Oct 12 everywhere).
 */
import type { ISODate } from './dto';

const at = (day: ISODate) => new Date(`${day}T12:00:00Z`);

export function fmtDay(day: ISODate, style: 'short' | 'weekday' | 'long' | 'numeric' = 'short'): string {
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
      : style === 'weekday'
        ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }
        : style === 'numeric'
          ? { month: 'numeric', day: 'numeric', timeZone: 'UTC' }
          : { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return at(day).toLocaleDateString('en-US', opts);
}

export function fmtRange(a: ISODate, b: ISODate): string {
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return sameMonth ? `${fmtDay(a)} – ${at(b).getUTCDate()}` : `${fmtDay(a)} – ${fmtDay(b)}`;
}

export function addDays(day: ISODate, n: number): ISODate {
  const d = at(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(a: ISODate, b: ISODate): number {
  return Math.max(0, Math.round((at(b).getTime() - at(a).getTime()) / 86_400_000));
}

/** "Today", "Tomorrow", "Yesterday" or "Fri, Oct 16". */
export function relativeDay(day: ISODate, today: ISODate): string {
  const diff = nightsBetween(today, day) * (day >= today ? 1 : -1);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDay(day, 'weekday');
}

export function weekday(day: ISODate): number {
  return at(day).getUTCDay();
}

export function localToday(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export { money } from './status';
