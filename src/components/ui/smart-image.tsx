'use client';

import * as React from 'react';
import { BedDouble, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * An <img> that fades in when loaded and falls back to a soft branded
 * placeholder when the URL is missing or fails (offline, blocked host,
 * deleted upload) — never a broken-image icon.
 */
export function SmartImage({
  src,
  alt = '',
  className,
  imgClassName,
  icon: Icon = BedDouble,
  loading = 'lazy',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  icon?: LucideIcon;
  loading?: 'lazy' | 'eager';
}) {
  const [state, setState] = React.useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'error');
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    setState(src ? 'loading' : 'error');
  }, [src]);
  // Cached images can finish before hydration attaches onLoad.
  React.useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth > 0 ? 'ok' : 'error');
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {state !== 'ok' && (
        <div className={cn('absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-soft via-muted to-agent-soft', state === 'loading' && 'animate-pulse')}>
          {state === 'error' && <Icon className="h-1/4 max-h-12 w-1/4 max-w-12 text-primary/40" aria-hidden />}
        </div>
      )}
      {src && state !== 'error' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={cn('h-full w-full object-cover transition-opacity duration-500', state === 'ok' ? 'opacity-100' : 'opacity-0', imgClassName)}
        />
      )}
    </div>
  );
}
