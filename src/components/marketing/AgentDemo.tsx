'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, BedDouble, Check, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Scene = { command: string; render: (phase: number) => React.ReactNode };

const Row = ({ name, meta, badge, tone }: { name: string; meta: string; badge: string; tone: string }) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
      {name
        .split(' ')
        .map((p) => p[0])
        .join('')}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-muted-foreground">{meta}</p>
    </div>
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{badge}</span>
  </div>
);

const SCENES: Scene[] = [
  {
    command: 'Who’s arriving today?',
    render: () => (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ArrowDownToLine className="h-4 w-4 text-primary" /> 6 arrivals today
          </p>
          <span className="text-xs text-muted-foreground">2 need a room</span>
        </div>
        <div className="divide-y">
          <Row name="Jordan Smith" meta="Ocean King · 3 nights · anniversary" badge="No room" tone="bg-warning-soft text-warning" />
          <Row name="Grace Okafor" meta="Ocean King · Room 304" badge="Ready" tone="bg-success-soft text-success" />
          <Row name="Lucas Silva" meta="Family Suite · flight delayed" badge="Late" tone="bg-info-soft text-info" />
        </div>
      </div>
    ),
  },
  {
    command: 'Check in the Smiths — quiet room, high floor, note it’s their anniversary',
    render: (phase) => (
      <div className="overflow-hidden rounded-xl border border-agent/30 bg-card shadow-glow">
        <div className="flex items-center justify-between border-b bg-agent-soft/40 px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-agent" /> Review 2 changes
          </p>
          <span className="text-xs text-muted-foreground">nothing changes until you confirm</span>
        </div>
        <ul className="space-y-2 px-4 py-3 text-sm">
          <li className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" /> Check in Jordan Smith → <strong>Room 304</strong>
            <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">quiet · floor 3</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Add note: “Anniversary — chilled bubbles on arrival”
          </li>
        </ul>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Cancel</span>
          <motion.span
            animate={phase >= 2 ? { scale: [1, 0.94, 1] } : {}}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white', phase >= 2 ? 'bg-success' : 'bg-agent')}
          >
            {phase >= 2 ? (
              <>
                <Check className="h-3.5 w-3.5" /> Done · keys for 304
              </>
            ) : (
              'Confirm 2 changes'
            )}
          </motion.span>
        </div>
      </div>
    ),
  },
  {
    command: 'Raise Ocean King 10% for the next two weekends',
    render: () => (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" /> Ocean King · 4 nights
          </p>
          <span className="text-xs text-muted-foreground">weekends pacing at 89%</span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {[
            ['Fri 16', 227, 250],
            ['Sat 17', 227, 250],
            ['Fri 23', 306, 337],
            ['Sat 24', 306, 337],
          ].map(([d, a, b]) => (
            <div key={d as string} className="rounded-lg bg-muted/60 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{d}</p>
              <p className="text-[11px] text-muted-foreground line-through">${a}</p>
              <p className="text-sm font-semibold text-agent">${b}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

/** Looping illustration of the agent: a typed request becomes live UI. */
export function AgentDemo({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [scene, setScene] = React.useState(0);
  const [typed, setTyped] = React.useState(0);
  const [phase, setPhase] = React.useState(0); // 0 typing, 1 answer shown, 2 confirmed
  const s = SCENES[scene];

  React.useEffect(() => {
    if (reduce) {
      setTyped(s.command.length);
      setPhase(2);
      const t = setTimeout(() => setScene((x) => (x + 1) % SCENES.length), 6000);
      return () => clearTimeout(t);
    }
    setTyped(0);
    setPhase(0);
    let i = 0;
    const typer = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= s.command.length) clearInterval(typer);
    }, 28);
    const t1 = setTimeout(() => setPhase(1), s.command.length * 28 + 450);
    const t2 = setTimeout(() => setPhase(2), s.command.length * 28 + 2300);
    const t3 = setTimeout(() => setScene((x) => (x + 1) % SCENES.length), s.command.length * 28 + 4600);
    return () => {
      clearInterval(typer);
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, [scene, s.command.length, reduce]);

  return (
    <div className={cn('relative rounded-3xl border bg-surface/80 p-4 shadow-float backdrop-blur sm:p-5', className)} aria-hidden>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-agent" /> StayOS agent
        </span>
        <span className="ml-auto flex gap-1">
          {SCENES.map((_, i) => (
            <span key={i} className={cn('h-1 rounded-full transition-all', i === scene ? 'w-5 bg-agent' : 'w-2 bg-muted')} />
          ))}
        </span>
      </div>
      <div className="min-h-[248px] space-y-3">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            {s.command.slice(0, typed)}
            {typed < s.command.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-blink bg-primary-foreground" />}
          </p>
        </div>
        <AnimatePresence mode="wait">
          {phase >= 1 && (
            <motion.div key={scene} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {s.render(phase)}
            </motion.div>
          )}
        </AnimatePresence>
        {phase === 0 && typed >= s.command.length && (
          <div className="flex gap-1 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-agent" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
