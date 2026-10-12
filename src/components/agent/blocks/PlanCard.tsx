'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import type { AgentBlock } from '@/lib/agent/blocks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/primitives';
import { useAgentUI } from '../AgentUI';

const RISK = {
  low: { label: 'Routine', className: 'bg-success-soft text-success' },
  medium: { label: 'Review', className: 'bg-warning-soft text-warning' },
  high: { label: 'High impact', className: 'bg-destructive-soft text-destructive' },
} as const;

function useExpired(expiresAt: string) {
  const [expired, setExpired] = React.useState(() => Date.parse(expiresAt) < Date.now());
  React.useEffect(() => {
    const ms = Date.parse(expiresAt) - Date.now();
    if (ms <= 0) return setExpired(true);
    const t = window.setTimeout(() => setExpired(true), Math.min(ms, 2 ** 31 - 1));
    return () => window.clearTimeout(t);
  }, [expiresAt]);
  return expired;
}

/**
 * The agent never acts on its own: every change arrives as this card.
 * The person sees each step, any warnings, and decides.
 */
export function PlanCard({ block }: { block: Extract<AgentBlock, { type: 'plan' }> }) {
  const { plan } = block;
  const { confirm, dismiss, plans, latestPlan } = useAgentUI();
  const state = plans[plan.token] ?? 'idle';
  const expired = useExpired(plan.expiresAt);
  const decided = state === 'done' || state === 'dismissed' || state === 'failed';
  const isLatest = latestPlan === plan.token;
  const risk = RISK[plan.risk];

  // ⌘/Ctrl + Enter confirms the newest open plan.
  React.useEffect(() => {
    if (!isLatest || decided || expired) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        confirm(plan.token);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLatest, decided, expired, confirm, plan.token]);

  return (
    <motion.div
      layout
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-lifted',
        !decided && !expired && 'ring-aurora',
        decided && 'shadow-xs'
      )}
    >
      <div className="flex items-start gap-3 border-b px-4 py-3.5">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', decided ? 'bg-muted text-muted-foreground' : 'bg-aurora animate-aurora text-white shadow-glow')}>
          {state === 'done' ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Sparkles className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {state === 'done' ? 'Carried out' : state === 'dismissed' ? 'Cancelled' : state === 'failed' ? 'Partly carried out' : expired ? 'Expired' : 'Ready when you are'}
          </p>
          <p className="mt-0.5 font-semibold leading-snug">{plan.title}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', risk.className)}>{risk.label}</span>
      </div>

      <ol className={cn('space-y-0 px-4 py-2', decided && 'opacity-70')}>
        {plan.steps.map((s, i) => (
          <li key={i} className="flex gap-3 py-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular text-muted-foreground">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{s.summary}</p>
              {s.detail && <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>

      {plan.warnings.length > 0 && !decided && (
        <div className="mx-4 mb-3 space-y-1.5 rounded-xl border border-warning/25 bg-warning-soft/50 px-3 py-2.5">
          {plan.warnings.map((w, i) => (
            <p key={i} className="flex gap-2 text-xs text-foreground/90">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-surface-sunken/60 px-4 py-3">
        {decided ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {state === 'dismissed' ? <Ban className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5 text-success" />}
            {state === 'dismissed' ? 'Nothing was changed.' : 'Logged to the activity trail.'}
          </p>
        ) : expired ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Plans expire after 10 minutes so they reflect live data. Ask again.
          </p>
        ) : (
          <>
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Nothing changes until you confirm
              {isLatest && (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  · <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                </span>
              )}
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismiss(plan.token)} disabled={state === 'running'}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={plan.risk === 'high' ? 'destructive' : 'agent'}
                loading={state === 'running'}
                onClick={() => confirm(plan.token)}
                autoFocus={isLatest}
              >
                {plan.confirmLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
