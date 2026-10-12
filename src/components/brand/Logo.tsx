import { cn } from '@/lib/utils';
import { PRODUCT_NAME } from '@/config/product';

/** StayOS mark: a doorway inside a rounded tile, in the brand teal. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id="stayos-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(188 80% 38%)" />
          <stop offset="1" stopColor="hsl(200 85% 26%)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#stayos-g)" />
      <path d="M10 24V12.5a6 6 0 0 1 12 0V24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="19" cy="18.5" r="1.4" fill="white" />
      <path d="M7.5 24h17" stroke="white" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && <span className="text-[17px] font-semibold tracking-tight">{PRODUCT_NAME}</span>}
    </span>
  );
}
