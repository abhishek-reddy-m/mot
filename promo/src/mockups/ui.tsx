// Minimal re-creations of the app's shadcn/ui primitives and lucide icons
// (src/components/ui/*.tsx), using the same Tailwind values, so product
// mockups look like the real Casa Blanca screens.
import React from 'react';
import {APP, FONT} from '../theme.ts';

/** Mobile viewport width in CSS px; mockups are laid out at this width, then zoomed. */
export const VIEWPORT = 430;

/**
 * A slice of the app laid out at `viewport` CSS px wide and zoomed to fill
 * `width` output px. `zoom` (unlike a scale transform) scales the layout box
 * too, so clip-paths and stacking around a mockup line up with what is drawn.
 */
export const Screen: React.FC<{
  width: number;
  viewport?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({width, viewport = VIEWPORT, children, style}) => (
  <div
    style={{
      width: viewport,
      zoom: width / viewport,
      fontFamily: FONT.app,
      color: APP.gray900,
      fontSize: 16,
      lineHeight: 1.5,
      WebkitFontSmoothing: 'antialiased',
      ...style,
    }}
  >
    {children}
  </div>
);

/** `rounded-lg border bg-card text-card-foreground shadow-sm` */
export const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <div
    style={{
      borderRadius: 8,
      border: `1px solid ${APP.border}`,
      background: APP.white,
      boxShadow: APP.shadowSm,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

/** shadcn Button, default variant (`bg-primary text-primary-foreground shadow`). */
export const Button: React.FC<{
  children: React.ReactNode;
  pressed?: boolean;
  size?: 'default' | 'sm';
  variant?: 'default' | 'outline';
  bg?: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({children, pressed, size = 'default', variant = 'default', bg, color, style}) => {
  const outline = variant === 'outline';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: size === 'sm' ? 32 : 36,
        padding: size === 'sm' ? '0 12px' : '8px 16px',
        borderRadius: 6,
        fontSize: size === 'sm' ? 12 : 14,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        background: outline ? APP.white : (bg ?? APP.primary),
        color: color ?? (outline ? APP.gray900 : APP.primaryFg),
        border: outline ? `1px solid ${APP.border}` : 'none',
        boxShadow: outline ? APP.shadowSm : APP.shadow,
        transform: pressed ? 'scale(0.97)' : undefined,
        filter: pressed ? 'brightness(0.82)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** shadcn Badge: `rounded-md border px-2.5 py-0.5 text-xs font-semibold`. */
export const Badge: React.FC<{
  children: React.ReactNode;
  bg: string;
  color: string;
  border?: string;
  style?: React.CSSProperties;
}> = ({children, bg, color, border, style}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 6,
      border: `1px solid ${border ?? 'transparent'}`,
      padding: '2px 10px',
      fontSize: 12,
      lineHeight: '16px',
      fontWeight: 600,
      background: bg,
      color,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

// --- lucide-react icons (stroke icons, 24x24 viewBox, stroke-width 2) -------

const Icon: React.FC<{size?: number; color?: string; children: React.ReactNode}> = ({
  size = 16,
  color = 'currentColor',
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{flexShrink: 0}}
  >
    {children}
  </svg>
);

type IconProps = {size?: number; color?: string};

export const MapPin: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const CalendarIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </Icon>
);

export const UsersIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const DollarIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Icon>
);

export const CheckCircle: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

/**
 * Stand-in for the seeded Ocean Suite photo (the Unsplash image the seed links
 * to is not bundled): a flat drawing of a suite with an ocean-view window.
 */
export const SuitePhoto: React.FC<{height: number}> = ({height}) => (
  <svg width="100%" height={height} viewBox="0 0 430 192" preserveAspectRatio="xMidYMid slice">
    <rect width="430" height="192" fill="#e9e3d8" />
    {/* window */}
    <rect x="150" y="18" width="250" height="118" fill="#f7f4ee" />
    <rect x="158" y="26" width="234" height="58" fill="#c9def0" />
    <rect x="158" y="84" width="234" height="44" fill="#3f78a8" />
    <rect x="158" y="84" width="234" height="5" fill="#5e93bf" />
    <rect x="272" y="26" width="6" height="102" fill="#f7f4ee" />
    {/* curtain */}
    <rect x="128" y="10" width="26" height="140" fill="#d8cdbb" />
    {/* floor */}
    <rect x="0" y="150" width="430" height="42" fill="#c8b59a" />
    {/* headboard + bed */}
    <rect x="18" y="72" width="170" height="70" rx="4" fill="#7a5f47" />
    <rect x="8" y="122" width="214" height="44" rx="5" fill="#ffffff" />
    <rect x="8" y="148" width="214" height="18" rx="3" fill="#e8e1d5" />
    <rect x="30" y="104" width="62" height="24" rx="8" fill="#fbfaf7" />
    <rect x="104" y="104" width="62" height="24" rx="8" fill="#fbfaf7" />
    {/* nightstand + lamp */}
    <rect x="232" y="128" width="40" height="34" fill="#7a5f47" />
    <rect x="246" y="104" width="12" height="24" fill="#d9c7a6" />
    <rect x="238" y="92" width="28" height="14" fill="#f1e6cf" />
  </svg>
);
