'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownToLine, CheckCircle2, Hand, Play, RefreshCw, Sparkles, SprayCan, UserRound, Wand2 } from 'lucide-react';
import type { HousekeepingTaskDTO, RoomSummary, TeamMember } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { fmtDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskStatusBadge } from '@/components/hotel/badges';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

function useHousekeepingData() {
  const tasksUrl = usePropertyUrl('/api/admin/housekeeping', { includeDone: '1' });
  const tasks = useSWR<HousekeepingTaskDTO[]>(tasksUrl, fetcher, { refreshInterval: 30_000 });
  return tasks;
}

async function updateTask(id: string, body: object) {
  return api(`/api/admin/housekeeping/${id}`, { method: 'PATCH', json: body });
}

/* ------------------------------------------------------------------ */
/* Housekeeper: my rooms (phone-first)                                 */
/* ------------------------------------------------------------------ */

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} className="fill-none stroke-muted" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="fill-none stroke-success transition-[stroke-dashoffset] duration-700"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular">
        {done}/{total}
      </span>
    </div>
  );
}

function MyRooms() {
  const { ctx, refresh } = useConsole();
  const { data, isLoading, mutate } = useHousekeepingData();
  const [busy, setBusy] = React.useState<string | null>(null);
  const me = ctx?.user.id;
  const mine = (data ?? []).filter((t) => t.assignee?.id === me);
  const open = mine.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const done = mine.filter((t) => t.status === 'COMPLETED' || t.status === 'INSPECTED');
  const available = (data ?? []).filter((t) => !t.assignee && (t.status === 'PENDING' || t.status === 'IN_PROGRESS'));

  async function act(t: HousekeepingTaskDTO, status: HousekeepingTaskDTO['status'], msg: string) {
    setBusy(t.id);
    try {
      await updateTask(t.id, { status });
      toast.success(msg);
      await mutate();
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{ctx ? fmtDay(ctx.today, 'long') : ''}</p>
          <h1 className="text-2xl font-semibold tracking-tight">My rooms</h1>
          <p className="text-sm text-muted-foreground">{open.length ? `${open.length} to go — rooms needed for arrivals first.` : 'All caught up. Nice work! ✨'}</p>
        </div>
        <ProgressRing done={done.length} total={mine.length} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {open.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
                  <Card className={cn('p-4', t.status === 'IN_PROGRESS' && 'border-info/40 ring-2 ring-info/15')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-3xl font-semibold tabular">{t.room.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.room.roomTypeName} · Floor {t.room.floor ?? '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <TaskStatusBadge status={t.status} />
                        {t.priority >= 3 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                            <ArrowDownToLine className="h-3 w-3" /> Guest arriving
                          </span>
                        )}
                        {t.room.occupancy === 'OCCUPIED' && <span className="text-[11px] text-muted-foreground">Guest staying — knock first</span>}
                      </div>
                    </div>
                    {t.notes && <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs">{t.notes}</p>}
                    <div className="mt-4">
                      {t.status === 'PENDING' ? (
                        <Button size="lg" className="w-full" variant="outline" loading={busy === t.id} onClick={() => act(t, 'IN_PROGRESS', `Started room ${t.room.number}`)}>
                          <Play className="h-4 w-4" /> Start cleaning
                        </Button>
                      ) : (
                        <Button size="lg" className="w-full bg-success text-success-foreground hover:bg-success/90" loading={busy === t.id} onClick={() => act(t, 'COMPLETED', `Room ${t.room.number} is clean`)}>
                          <CheckCircle2 className="h-4 w-4" /> Mark clean
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {available.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Available to pick up</p>
              <ul className="space-y-2">
                {available.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                    <div>
                      <span className="text-lg font-semibold tabular">{t.room.number}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{t.room.roomTypeName}</span>
                    </div>
                    <Button size="sm" variant="soft" loading={busy === t.id} onClick={() => act(t, 'IN_PROGRESS', `Room ${t.room.number} is yours`)}>
                      <Hand className="h-4 w-4" /> Take it
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Done today · {done.length}</p>
              <div className="flex flex-wrap gap-2">
                {done.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3 w-3" /> {t.room.number}
                  </span>
                ))}
              </div>
            </div>
          )}
          {mine.length === 0 && available.length === 0 && <EmptyState icon={SprayCan} title="Nothing assigned yet" description="Your supervisor will assign rooms here. Pull down to refresh." />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Supervisor board                                                    */
/* ------------------------------------------------------------------ */

function TaskCard({ task, team, onChange }: { task: HousekeepingTaskDTO; team: TeamMember[]; onChange: () => void }) {
  const { can } = useConsole();
  const [busy, setBusy] = React.useState(false);
  async function run(body: object, msg: string) {
    setBusy(true);
    try {
      await updateTask(task.id, body);
      toast.success(msg);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const done = task.status === 'COMPLETED' || task.status === 'INSPECTED';
  return (
    <motion.div layout className={cn('rounded-xl border bg-card p-3 shadow-xs', task.priority >= 3 && !done && 'border-warning/40')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold leading-none tabular">{task.room.number}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {task.room.roomTypeName} · Fl {task.room.floor ?? '—'}
          </p>
        </div>
        {task.priority >= 3 && !done && <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">ARRIVAL</span>}
      </div>
      {!done && can('housekeeping.assign') ? (
        <Select value={task.assignee?.id ?? ''} onValueChange={(v) => run({ assignedTo: v }, `Room ${task.room.number} assigned`)}>
          <SelectTrigger className="mt-3 h-8 text-xs">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="h-3 w-3" /> {task.assignee?.name ?? 'Unassigned'}
        </p>
      )}
      <div className="mt-2 flex gap-1.5">
        {task.status === 'PENDING' && (
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" loading={busy} onClick={() => run({ status: 'IN_PROGRESS' }, `Room ${task.room.number} started`)}>
            Start
          </Button>
        )}
        {task.status === 'IN_PROGRESS' && (
          <Button size="sm" className="h-7 flex-1 text-xs" loading={busy} onClick={() => run({ status: 'COMPLETED' }, `Room ${task.room.number} is clean`)}>
            Mark clean
          </Button>
        )}
        {task.status === 'COMPLETED' && (
          <Button size="sm" variant="soft" className="h-7 flex-1 text-xs" loading={busy} onClick={() => run({ status: 'INSPECTED' }, `Room ${task.room.number} inspected`)}>
            <Sparkles className="h-3 w-3" /> Inspect
          </Button>
        )}
        {task.status === 'INSPECTED' && <span className="text-xs font-medium text-success">Ready to sell</span>}
      </div>
    </motion.div>
  );
}

function SupervisorBoard() {
  const { refresh, askAgent, can } = useConsole();
  const { data: tasks, isLoading, mutate, isValidating } = useHousekeepingData();
  const teamUrl = usePropertyUrl('/api/admin/team', { role: 'HOUSEKEEPER' });
  const boardUrl = usePropertyUrl('/api/admin/room-board');
  const { data: team } = useSWR<TeamMember[]>(teamUrl, fetcher);
  const { data: rooms, mutate: mutateRooms } = useSWR<RoomSummary[]>(boardUrl, fetcher, { refreshInterval: 30_000 });
  const [autoBusy, setAutoBusy] = React.useState(false);
  const { propertyId } = useConsole();

  const onChange = () => {
    void mutate();
    void mutateRooms();
    refresh();
  };

  const unqueued = (rooms ?? []).filter((r) => r.status === 'DIRTY' && !r.task && !r.isOutOfOrder);
  const todo = (tasks ?? []).filter((t) => t.status === 'PENDING');
  const doing = (tasks ?? []).filter((t) => t.status === 'IN_PROGRESS');
  const done = (tasks ?? []).filter((t) => t.status === 'COMPLETED' || t.status === 'INSPECTED');
  const unassigned = todo.filter((t) => !t.assignee).length + unqueued.length;

  async function queueRoom(roomId: string, assignedTo: string) {
    try {
      await api('/api/admin/housekeeping', { method: 'POST', json: { roomId, assignedTo } });
      toast.success('Room queued');
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function autoAssign() {
    setAutoBusy(true);
    try {
      const r = await api<{ assigned: number }>('/api/admin/housekeeping/auto-assign', { method: 'POST', json: { propertyId } });
      toast.success(r.assigned ? `Assigned ${r.assigned} room${r.assigned > 1 ? 's' : ''}` : 'Everything already has someone on it');
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAutoBusy(false);
    }
  }

  const columns = [
    { key: 'todo', title: 'To clean', items: todo, tone: 'bg-warning' },
    { key: 'doing', title: 'Cleaning', items: doing, tone: 'bg-info' },
    { key: 'done', title: 'Done today', items: done, tone: 'bg-success' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Housekeeping"
        description={tasks ? `${todo.length + doing.length + unqueued.length} rooms to turn · ${done.length} done today` : 'Loading…'}
        actions={
          <>
            {can('agent.use') && (
              <Button variant="ghost" size="sm" className="text-agent hover:bg-agent-soft" onClick={() => askAgent('show the housekeeping board')}>
                <Sparkles className="h-4 w-4" /> Ask
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onChange} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} />
            </Button>
            {can('housekeeping.assign') && (
              <Button size="sm" onClick={autoAssign} loading={autoBusy} disabled={!unassigned}>
                <Wand2 className="h-4 w-4" /> Auto-assign {unassigned ? `(${unassigned})` : ''}
              </Button>
            )}
          </>
        }
      />

      {team && team.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-xs">
              <Avatar name={m.name} size="sm" />
              <div>
                <p className="text-sm font-medium leading-tight">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.openTasks ?? 0} open</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {unqueued.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium">Dirty, not yet queued · {unqueued.length}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {unqueued.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border border-dashed p-2.5">
                <span className="w-12 text-lg font-semibold tabular">{r.number}</span>
                <Select onValueChange={(v) => queueRoom(r.id, v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Assign…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(team ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="rounded-2xl border bg-surface-sunken/50 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn('h-2 w-2 rounded-full', col.tone)} />
                <p className="text-sm font-medium">{col.title}</p>
                <span className="ml-auto text-xs text-muted-foreground tabular">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((t) => (
                  <TaskCard key={t.id} task={t} team={team ?? []} onChange={onChange} />
                ))}
                {col.items.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nothing here</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HousekeepingPage() {
  const { role } = useConsole();
  return role === 'HOUSEKEEPER' ? <MyRooms /> : <SupervisorBoard />;
}
