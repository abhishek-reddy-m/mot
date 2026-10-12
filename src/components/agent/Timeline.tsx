'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentTurn } from './useAgent';
import { BlockRenderer } from './BlockRenderer';

export function AgentOrb({ busy, className }: { busy?: boolean; className?: string }) {
  return (
    <span className={cn('relative flex h-7 w-7 shrink-0 items-center justify-center', className)} aria-hidden>
      <span className={cn('bg-aurora animate-aurora absolute inset-0 rounded-full', busy && 'animate-pulse-ring')} />
      <span className="absolute inset-[3px] rounded-full bg-card/30 backdrop-blur-[1px]" />
      <span className="relative h-2 w-2 rounded-full bg-white shadow" />
    </span>
  );
}

function StatusTicker({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-agent" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
      <AnimatePresence mode="wait">
        <motion.span key={text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function Timeline({
  turns,
  onRetry,
  compact,
}: {
  turns: AgentTurn[];
  onRetry: (text: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-6" role="log" aria-live="polite" aria-relevant="additions">
      {turns.map((t, i) =>
        t.role === 'user' ? (
          <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14.5px] leading-relaxed text-background shadow-soft">
              {t.text}
            </div>
            {t.via === 'voice' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <AudioLines className="h-3 w-3" /> said aloud
              </span>
            )}
            {t.retryable && (
              <button onClick={() => onRetry(t.text!)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            )}
          </motion.div>
        ) : (
          <div key={t.id} className="flex gap-3">
            <AgentOrb busy={t.pending} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-3">
              {t.blocks.map((b, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(j * 0.06, 0.3) }}
                >
                  <BlockRenderer block={b} />
                </motion.div>
              ))}
              {t.pending && t.status && <StatusTicker text={t.status} />}
              {t.error && <p className="rounded-xl border border-destructive/25 bg-destructive-soft/50 px-3.5 py-2.5 text-sm text-destructive">{t.error}</p>}
              {!t.pending && t.ms !== undefined && i === turns.length - 1 && !compact && (
                <p className="text-[11px] text-muted-foreground/70">Answered from live data in {t.ms < 1000 ? `${t.ms} ms` : `${(t.ms / 1000).toFixed(1)} s`}</p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

/** Keeps a scroll container pinned to the bottom unless the person scrolls up. */
export function useStickToBottom<T extends HTMLElement>(dep: unknown) {
  const ref = React.useRef<T>(null);
  const pinned = React.useRef(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  React.useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [dep]);
  return ref;
}
