/**
 * Deterministic intent parser for the agentic (beta) command interface.
 *
 * No LLM key is required: staff commands are matched against a fixed set of
 * front-desk intents and executed against real DB data via src/lib/agent/tools.ts.
 * When OPENAI_API_KEY + AGENT_LLM_ENABLED=true are configured, the router
 * (src/lib/agent/router.ts) can delegate to an LLM tool-calling agent that
 * calls the SAME tools — the parser stays as the deterministic fallback.
 */

export type Intent =
  | { type: 'arrivals'; date: Date }
  | { type: 'departures'; date: Date }
  | { type: 'availability'; checkIn: Date; checkOut: Date; guests: number }
  | { type: 'reservation'; id: string }
  | { type: 'search'; name: string }
  | { type: 'occupancy'; from: Date; to: Date }
  | { type: 'property' }
  | { type: 'help' }
  | { type: 'unknown' };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Next Friday from `now` (weekend = Fri..Sun). */
function nextWeekend(now: Date): { from: Date; to: Date } {
  const d = startOfDay(now);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const daysUntilFriday = (5 - dow + 7) % 7 || 7; // if today is Friday, take next Friday
  const from = addDays(d, daysUntilFriday);
  return { from, to: addDays(from, 3) };
}

function parseDateRef(text: string, now: Date): Date | null {
  const t = text.toLowerCase();
  if (/\btoday\b|\btonight\b/.test(t)) return startOfDay(now);
  if (/\btomorrow\b/.test(t)) return addDays(startOfDay(now), 1);
  if (/\bnext weekend\b/.test(t)) return nextWeekend(now).from;
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
    if (!isNaN(d.getTime())) return startOfDay(d);
  }
  return null;
}

function parseGuests(text: string): number {
  const m = text.toLowerCase().match(/(\d+)\s*guest/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 20) return n;
  }
  return 2;
}

export function parseCommand(message: string, now: Date = new Date()): Intent {
  const t = message.toLowerCase().trim();
  if (!t) return { type: 'unknown' };

  if (/\bhelp\b|what can you do|commands/.test(t)) return { type: 'help' };

  // Reservation lookup by id: "reservation 4821", "booking cmv48hr87"
  const idMatch = t.match(/(?:reservation|booking)\s+(?:#)?([a-z0-9-]+)/i);
  if (idMatch && /(reservation|booking)/.test(t)) {
    return { type: 'reservation', id: idMatch[1] };
  }

  // Guest search: "find Smith", "search jane doe", "lookup <name>"
  const searchMatch = t.match(/^(?:find|search|lookup)(?:\s+for)?\s+(.+)$/i);
  if (searchMatch && !/(reservation|booking|room|arrival|departure|occupancy|availab)/.test(t)) {
    return { type: 'search', name: searchMatch[1].trim() };
  }

  if (/arriv|checking in|check-in|check in/.test(t)) {
    return { type: 'arrivals', date: parseDateRef(t, now) ?? startOfDay(now) };
  }
  if (/depart|checking out|check-out|check out|leaving/.test(t)) {
    return { type: 'departures', date: parseDateRef(t, now) ?? startOfDay(now) };
  }
  if (/occupan|how full|booked|utilization/.test(t)) {
    if (/\bnext weekend\b/.test(t)) {
      const { from, to } = nextWeekend(now);
      return { type: 'occupancy', from, to };
    }
    const ref = parseDateRef(t, now);
    const from = ref ?? startOfDay(now);
    return { type: 'occupancy', from, to: addDays(from, 7) };
  }
  if (/availab|free rooms|rooms available|vacan|any rooms/.test(t)) {
    const ref = parseDateRef(t, now);
    const checkIn = ref ?? startOfDay(now);
    return { type: 'availability', checkIn, checkOut: addDays(checkIn, 1), guests: parseGuests(t) };
  }
  if (/property|about (this|the) (hotel|property)|hotel info/.test(t)) {
    return { type: 'property' };
  }

  return { type: 'unknown' };
}

export const HELP_TEXT = [
  'Here\u2019s what I can do (beta — deterministic, no AI model yet):',
  '• "today\u2019s arrivals" / "who\u2019s checking in tomorrow"',
  '• "departures today"',
  '• "availability for 2026-11-14" / "free rooms next weekend"',
  '• "reservation <id>" / "find Smith"',
  '• "occupancy next weekend" / "how full are we this week"',
  '• "property info"',
].join('\n');
