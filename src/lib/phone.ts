/** "+1 (831) 555-0100" or "0044 20 7946 0000" → E.164 ("+18315550100"); null if it isn't an international number. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let n = raw.trim().replace(/[\s().-]/g, '');
  if (n.startsWith('00')) n = `+${n.slice(2)}`;
  return /^\+[1-9]\d{6,14}$/.test(n) ? n : null;
}

/** A caller ID as carriers pass it: E.164 or bare digits. Withheld/anonymous/SIP URIs become null. */
export function callerNumber(raw: string | null | undefined): string | null {
  const n = (raw ?? '').trim().replace(/[\s().-]/g, '');
  return /^\+?\d{6,15}$/.test(n) ? n : null;
}
