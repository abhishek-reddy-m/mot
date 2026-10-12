import type {Bg} from './timeline.ts';

export const PAPER = '#ECE8DF';
export const INK = '#0D0D0C';
export const LIME = '#D2FF3A';

export const SURFACE: Record<Bg, {bg: string; fg: string; dim: string}> = {
  paper: {bg: PAPER, fg: INK, dim: 'rgba(13,13,12,0.55)'},
  ink: {bg: INK, fg: PAPER, dim: 'rgba(236,232,223,0.55)'},
  lime: {bg: LIME, fg: INK, dim: 'rgba(13,13,12,0.6)'},
};

export const FONT = {
  sans: '"Inter Tight", sans-serif',
  serif: '"Instrument Serif", serif',
  mono: '"JetBrains Mono", monospace',
  // The app's own fonts (src/app/layout.tsx)
  app: 'Inter, ui-sans-serif, system-ui, sans-serif',
  script: '"Dancing Script", cursive',
  montserrat: 'Montserrat, sans-serif',
};

export const MARGIN = 80;

/** Headline spec: Inter Tight 800, tracking -0.055em, line-height 0.92. */
export const HEADLINE = {
  fontFamily: FONT.sans,
  fontWeight: 800,
  letterSpacing: '-0.055em',
  lineHeight: 0.92,
} as const;

/** Instrument Serif italic runs small next to Inter Tight; this evens the cap height. */
export const SERIF_SCALE = 1.12;

export const SERIF = {
  fontFamily: FONT.serif,
  fontStyle: 'italic',
  fontWeight: 400,
  letterSpacing: '-0.02em',
  lineHeight: 0.92,
} as const;

export const MONO = {
  fontFamily: FONT.mono,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
} as const;

/**
 * Tailwind 3.3 colors and shadcn tokens exactly as the app uses them
 * (tailwind.config.ts, src/app/globals.css), for product mockups only.
 */
export const APP = {
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue600: '#2563eb',
  blue800: '#1e40af',
  blue900: '#1e3a8a',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  yellow100: '#fef9c3',
  yellow800: '#854d0e',
  red600: '#dc2626',
  primary: 'hsl(0 0% 9%)',
  primaryFg: 'hsl(0 0% 98%)',
  border: 'hsl(0 0% 89.8%)',
  mutedFg: 'hsl(0 0% 45.1%)',
  destructive: 'hsl(0 84.2% 60.2%)',
  destructiveFg: 'hsl(0 0% 98%)',
  shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
};
