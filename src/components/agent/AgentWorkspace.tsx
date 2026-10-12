'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { ArrowDownToLine, ArrowUpFromLine, BedDouble, CalendarRange, ChartLine, ConciergeBell, History, ShieldCheck, Sparkles, SprayCan } from 'lucide-react';
import type { FrontDeskSummary } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, greeting } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';
import { Skeleton } from '@/components/ui/primitives';
import { AgentPanel } from './AgentPanel';
import { AgentOrb } from './Timeline';
import type { AgentController } from './useAgent';

const STARTERS = [
  { icon: Sparkles, title: 'Brief me', hint: 'Today at a glance, with alerts', command: 'brief me' },
  { icon: ArrowDownToLine, title: 'Who’s arriving?', hint: 'Today’s arrivals and rooms', command: 'who’s arriving today?' },
  { icon: ConciergeBell, title: 'Check in a guest', hint: '“…the Smiths, quiet room, high floor”', command: 'check in the Smiths, quiet room on a high floor' },
  { icon: SprayCan, title: 'Rooms to clean', hint: 'Dirty rooms and who’s on them', command: 'which rooms need cleaning?' },
  { icon: CalendarRange, title: 'Availability', hint: 'Next weekend, 2 guests', command: 'availability next weekend for 2 guests' },
  { icon: ChartLine, title: 'Weekend outlook', hint: 'Occupancy and rate strategy', command: 'forecast the next 3 weekends' },
];

function Hero({ send }: { send: (cmd: string) => void }) {
  const { ctx, property } = useConsole();
  const first = ctx?.user.name.split(' ')[0] ?? '';
  return (
    <div className="flex min-h-[60vh] flex-col justify-center py-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <AgentOrb className="h-12 w-12" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}, {first}.
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          I’m the front-desk agent for <span className="font-medium text-foreground">{property?.name}</span>. Ask in plain words — I answer from live data,
          show you the right screen for it, and <span className="font-medium text-foreground">ask before changing anything</span>.
        </p>
      </motion.div>
      <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => send(s.command)}
            className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-agent/30 hover:shadow-soft"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-agent-soft text-agent transition-colors group-hover:bg-aurora group-hover:text-white">
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{s.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
            </span>
          </motion.button>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" /> Every action is permission-checked and written to the activity log.
      </p>
    </div>
  );
}

function LiveRail({ agent }: { agent: AgentController }) {
  const url = usePropertyUrl('/api/admin/front-desk');
  const { data } = useSWR<FrontDeskSummary>(url, fetcher, { refreshInterval: 60_000 });
  const stats = data?.stats;
  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l bg-surface/60 p-4 scrollbar-thin xl:block">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Live · {data ? fmtDay(data.date, 'weekday') : '…'}</p>
      {!stats ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { icon: ArrowDownToLine, label: 'To arrive', value: stats.arrivalsDue, cmd: 'who’s arriving today?' },
            { icon: ArrowUpFromLine, label: 'To depart', value: stats.departuresDue, cmd: 'who’s leaving today?' },
            { icon: BedDouble, label: 'Tonight', value: `${stats.occupancyPct}%`, cmd: 'occupancy this week' },
            { icon: SprayCan, label: 'Dirty', value: stats.dirty, cmd: 'which rooms need cleaning?' },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => agent.send(s.cmd)}
              disabled={agent.busy}
              className="rounded-xl border bg-card p-3 text-left shadow-xs transition-all hover:-translate-y-px hover:shadow-soft"
            >
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-xl font-semibold tabular">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>
      )}
      {data && data.alerts.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Needs attention</p>
          <ul className="mt-2 space-y-1.5">
            {data.alerts.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => a.command && agent.send(a.command)}
                  disabled={!a.command || agent.busy}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors hover:bg-accent',
                    a.tone === 'danger' ? 'border-destructive/30' : a.tone === 'warning' ? 'border-warning/30' : ''
                  )}
                >
                  <span className="font-medium text-foreground">{a.title}</span>
                  {a.command && <span className="mt-0.5 block text-agent">“{a.command}”</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {agent.history.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <History className="h-3 w-3" /> Recent
          </p>
          <ul className="mt-2 space-y-0.5">
            {agent.history
              .slice(-6)
              .reverse()
              .map((h) => (
                <li key={h}>
                  <button onClick={() => agent.send(h)} disabled={agent.busy} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                    {h}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

/** The full Agentic workspace: conversation in the middle, live context on the right. */
export function AgentWorkspace() {
  return (
    <div className="h-[calc(100dvh-3.5rem)]">
      <AgentPanel empty={(send) => <Hero send={send} />} rail={(agent) => <LiveRail agent={agent} />} />
    </div>
  );
}
