'use client';

import { Loader2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceState } from './useLiveVoice';

/**
 * The voice "presence": breathes with your microphone level, glows while
 * the agent speaks, spins while it is looking something up.
 */
export function VoiceOrb({
  state,
  level,
  speaking,
  working,
  size = 56,
  className,
  tone = 'agent',
}: {
  state: VoiceState;
  level: number;
  speaking: boolean;
  working: boolean;
  size?: number;
  className?: string;
  tone?: 'agent' | 'brand';
}) {
  const live = state === 'live';
  const scale = live ? 1 + Math.min(level, 1) * 0.35 : 1;
  const bg = tone === 'brand' ? 'bg-brand' : 'bg-aurora animate-aurora';
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }} aria-hidden>
      {live && speaking && <span className={cn('absolute inset-0 rounded-full opacity-40 animate-ping', bg)} />}
      <span
        className={cn('absolute inset-0 rounded-full shadow-glow transition-transform duration-100', bg, !live && 'opacity-90')}
        style={{ transform: `scale(${scale})` }}
      />
      <span className="relative text-white">
        {state === 'connecting' || working ? <Loader2 className="h-1/2 w-1/2 animate-spin" style={{ width: size * 0.4, height: size * 0.4 }} /> : <Mic style={{ width: size * 0.38, height: size * 0.38 }} />}
      </span>
    </span>
  );
}
