'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircleAlert, CircleCheck, CircleHelp, CircleX, CornerDownRight } from 'lucide-react';
import type { AgentBlock, QuickAction } from '@/lib/agent/blocks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAgentUI } from '../AgentUI';

/** Minimal, safe rich text: **bold**, line breaks and "•" bullets. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const inline = (s: string, key: number) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={`${key}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>
      )
    );
  return (
    <div className={cn('space-y-1 text-[14.5px] leading-relaxed text-foreground/90', className)}>
      {lines.map((line, i) =>
        line.trim().startsWith('•') ? (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-agent">•</span>
            <span>{inline(line.trim().slice(1).trim(), i)}</span>
          </div>
        ) : (
          <p key={i}>{inline(line, i)}</p>
        )
      )}
    </div>
  );
}

export function ActionButtons({ actions, size = 'sm' }: { actions: QuickAction[]; size?: 'sm' | 'default' }) {
  const { send, prefill, busy } = useAgentUI();
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <Button
          key={a.label + a.command}
          size={size}
          variant={a.tone === 'primary' ? 'default' : a.tone === 'danger' ? 'ghost' : 'outline'}
          className={cn(a.tone === 'danger' && 'text-destructive hover:bg-destructive-soft hover:text-destructive')}
          disabled={busy && a.mode !== 'prefill'}
          onClick={() => (a.mode === 'prefill' ? prefill(a.command) : send(a.command))}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}

export function SuggestionsBlock({ block }: { block: Extract<AgentBlock, { type: 'suggestions' }> }) {
  const { send, busy } = useAgentUI();
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {block.items.map((s) => (
        <button
          key={s}
          disabled={busy}
          onClick={() => send(s)}
          className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1.5 text-[13px] text-muted-foreground shadow-xs transition-all hover:-translate-y-px hover:border-agent/40 hover:text-foreground disabled:opacity-50"
        >
          <CornerDownRight className="h-3 w-3 text-agent" />
          {s}
        </button>
      ))}
    </div>
  );
}

export function NavigateBlock({ block }: { block: Extract<AgentBlock, { type: 'navigate' }> }) {
  return (
    <Link
      href={block.href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {block.label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function ErrorBlock({ block }: { block: Extract<AgentBlock, { type: 'error' }> }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft/60 px-3.5 py-3 text-sm">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-foreground/90">{block.text}</p>
    </div>
  );
}

export function ClarifyBlock({ block }: { block: Extract<AgentBlock, { type: 'clarify' }> }) {
  const { send, busy } = useAgentUI();
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-start gap-2.5">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-agent" />
        <p className="text-sm font-medium">{block.question}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {block.options.map((o) => (
          <button
            key={o.command}
            disabled={busy}
            onClick={() => send(o.command)}
            className="rounded-xl border bg-surface px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:border-agent/40 hover:shadow-soft disabled:opacity-50"
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResultBlock({ block }: { block: Extract<AgentBlock, { type: 'result' }> }) {
  return (
    <div className={cn('rounded-2xl border p-4', block.ok ? 'border-success/30 bg-success-soft/50' : 'border-destructive/30 bg-destructive-soft/50')}>
      <div className="flex items-center gap-2 font-medium">
        {block.ok ? <CircleCheck className="h-5 w-5 text-success" /> : <CircleX className="h-5 w-5 text-destructive" />}
        {block.title}
      </div>
      <ul className="mt-2 space-y-1 pl-7 text-sm">
        {block.lines.map((l, i) => (
          <li key={i} className={cn(l.startsWith('✗') ? 'text-destructive' : l.startsWith('○') ? 'text-muted-foreground' : 'text-foreground/90')}>
            {l.replace(/^[✓✗○]\s*/, '')}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsBlock({ block }: { block: Extract<AgentBlock, { type: 'stats' }> }) {
  const { compact } = useAgentUI();
  const tone: Record<string, string> = {
    info: 'text-info',
    warning: 'text-warning',
    brand: 'text-primary',
    agent: 'text-agent',
    success: 'text-success',
    danger: 'text-destructive',
    neutral: 'text-foreground',
  };
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
      {block.items.map((s) => (
        <div key={s.label} className="rounded-xl border bg-card px-3.5 py-3 shadow-xs">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className={cn('mt-0.5 text-xl font-semibold tabular', tone[s.tone ?? 'neutral'])}>{s.value}</p>
          {s.hint && <p className="truncate text-[11px] text-muted-foreground">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}
