import type * as React from 'react';

/** "#0E7490" → "192 82% 31%" (the token format our CSS variables use). */
export function hexToHslTriplet(hex: string | null | undefined): string | null {
  const m = hex?.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * CSS variables that re-skin `brand` utilities (bg-brand, text-brand,
 * bg-brand-soft, ring-brand) with a property's colour on guest pages.
 */
export function brandStyle(hex: string | null | undefined): React.CSSProperties | undefined {
  const triplet = hexToHslTriplet(hex);
  if (!triplet) return undefined;
  const [h, s] = triplet.split(' ');
  const light = Number(triplet.split(' ')[2].replace('%', ''));
  return {
    ['--brand' as string]: triplet,
    ['--brand-foreground' as string]: light > 62 ? '222 47% 11%' : '0 0% 100%',
    ['--brand-soft' as string]: `${h} ${s} 95%`,
  };
}
