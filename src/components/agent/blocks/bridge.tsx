'use client';

import * as React from 'react';
import useSWR from 'swr';
import { CheckCircle2, CircleAlert, Cable, Loader2, RotateCcw, XCircle } from 'lucide-react';
import type { AgentBlock } from '@/lib/agent/blocks';
import { api, fetcher } from '@/lib/fetcher';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TaskView {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'NEEDS_HELP' | 'CANCELLED';
  summary: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

const LABEL: Record<TaskView['status'], string> = {
  QUEUED: 'Waiting for the operator',
  RUNNING: 'Working in your PMS',
  DONE: 'Done',
  FAILED: 'Couldn’t finish',
  NEEDS_HELP: 'Needs you',
  CANCELLED: 'Cancelled',
};

/** Follows one bridge task live until the operator reports back. */
export function BridgeTaskBlock({ block }: { block: Extract<AgentBlock, { type: 'bridgeTask' }> }) {
  const { data, mutate } = useSWR<TaskView>(`/api/admin/bridge/tasks/${block.taskId}`, fetcher, {
    refreshInterval: (d) => (!d || d.status === 'QUEUED' || d.status === 'RUNNING' ? 2500 : 0),
  });
  const status = data?.status ?? 'QUEUED';
  const active = status === 'QUEUED' || status === 'RUNNING';
  const [busy, setBusy] = React.useState(false);
  const act = async (action: 'cancel' | 'retry') => {
    setBusy(true);
    try {
      await mutate(await api<TaskView>(`/api/admin/bridge/tasks/${block.taskId}`, { method: 'PATCH', json: { action } }), { revalidate: false });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card', status === 'DONE' && 'border-success/30', (status === 'FAILED' || status === 'NEEDS_HELP') && 'border-warning/40')}>
      <div className="flex items-center gap-3 border-b bg-surface-sunken/50 px-4 py-2.5">
        <Cable className="h-4 w-4 text-muted-foreground" />
        <p className="flex-1 text-sm font-medium">
          {block.system} · {block.kind === 'LOOKUP' ? 'look-up' : 'change'}
        </p>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', status === 'DONE' ? 'text-success' : active ? 'text-agent' : 'text-warning')}>
          {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === 'DONE' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'CANCELLED' ? <XCircle className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {LABEL[status]}
        </span>
      </div>
      <div className="space-y-2 px-4 py-3">
        <p className="text-sm text-muted-foreground">“{block.instruction}”</p>
        {data?.summary && <p className="whitespace-pre-line text-sm">{data.summary}</p>}
        {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
        {active && (
          <p className="text-xs text-muted-foreground">
            {status === 'QUEUED' ? 'Your connector picks this up within a few seconds when it’s online.' : 'Reading the screen and working step by step — usually under a minute.'}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">{data ? `Sent ${timeAgo(data.createdAt)}` : ''}</span>
          <div className="flex gap-1.5">
            {status === 'QUEUED' && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" loading={busy} onClick={() => act('cancel')}>
                Cancel
              </Button>
            )}
            {(status === 'FAILED' || status === 'NEEDS_HELP') && (
              <Button size="sm" variant="outline" className="h-7 text-xs" loading={busy} onClick={() => act('retry')}>
                <RotateCcw className="h-3 w-3" /> Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
