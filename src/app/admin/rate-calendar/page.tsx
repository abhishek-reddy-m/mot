'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, ChevronLeft, ChevronRight, RotateCcw, Sparkles, X } from 'lucide-react';
import type { ISODate } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { addDays, fmtDay, fmtRange, weekday } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

interface RoomTypeLite {
  id: string;
  name: string;
  basePrice: number | string;
  totalRooms: number;
}
interface RateDay {
  date: ISODate;
  price: number;
  isCustom: boolean;
  sold: number;
  total: number;
}
interface RatesResponse {
  roomType: { id: string; name: string; basePrice: number; totalRooms: number };
  days: RateDay[];
}

type EditMode = 'set' | 'adjust' | 'reset';
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_JS = [1, 2, 3, 4, 5, 6, 0];

function monthGrid(month: string) {
  // month = YYYY-MM-01. Weeks start Monday; always 6 rows for a steady layout.
  const first = month;
  const offset = (weekday(first) + 6) % 7;
  const start = addDays(first, -offset);
  return { start, end: addDays(start, 41), cells: Array.from({ length: 42 }, (_, i) => addDays(start, i)) };
}

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export default function RateCalendarPage() {
  const { ctx, can, askAgent, refresh } = useConsole();
  const today = ctx?.today ?? '';
  const typesUrl = usePropertyUrl('/api/admin/room-types');
  const { data: types } = useSWR<RoomTypeLite[]>(typesUrl, fetcher);
  const [roomTypeId, setRoomTypeId] = React.useState<string>('');
  const [month, setMonth] = React.useState<string>('');
  React.useEffect(() => {
    if (today && !month) setMonth(`${today.slice(0, 7)}-01`);
  }, [today, month]);
  React.useEffect(() => {
    if (types?.length && !types.find((t) => t.id === roomTypeId)) setRoomTypeId(types[0].id);
  }, [types, roomTypeId]);

  const grid = month ? monthGrid(month) : null;
  const ratesUrl = roomTypeId && grid ? `/api/admin/room-types/${roomTypeId}/rates?startDate=${grid.start}&endDate=${grid.end}` : null;
  const { data, isLoading, mutate } = useSWR<RatesResponse>(ratesUrl, fetcher, { keepPreviousData: true });
  const byDay = React.useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);

  // Selection: drag or click start → shift/click end.
  const [anchor, setAnchor] = React.useState<ISODate | null>(null);
  const [focus, setFocus] = React.useState<ISODate | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const selStart = anchor && focus ? (anchor < focus ? anchor : focus) : null;
  const selEnd = anchor && focus ? (anchor < focus ? focus : anchor) : null;
  const inSel = (d: ISODate) => !!selStart && !!selEnd && d >= selStart && d <= selEnd;
  const editable = can('rates.write');

  React.useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const clear = () => {
    setAnchor(null);
    setFocus(null);
  };

  // Editor state
  const [mode, setMode] = React.useState<EditMode>('set');
  const [price, setPrice] = React.useState('');
  const [pct, setPct] = React.useState('10');
  const [dows, setDows] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);

  const selectedNights = React.useMemo(() => {
    if (!selStart || !selEnd) return [];
    const out: RateDay[] = [];
    for (let d = selStart; d <= selEnd; d = addDays(d, 1)) {
      if (dows.length && !dows.includes(weekday(d))) continue;
      const r = byDay.get(d);
      if (r) out.push(r);
    }
    return out;
  }, [selStart, selEnd, dows, byDay]);

  React.useEffect(() => {
    if (selectedNights.length && !price) setPrice(String(Math.round(selectedNights[0].price)));
  }, [selectedNights, price]);

  const preview = (r: RateDay) => {
    if (mode === 'set') return Number(price) || r.price;
    if (mode === 'adjust') return Math.max(0, Math.round(r.price * (1 + (Number(pct) || 0) / 100)));
    return data?.roomType.basePrice ?? r.price;
  };
  const before = selectedNights.reduce((s, r) => s + r.price, 0);
  const after = selectedNights.reduce((s, r) => s + preview(r), 0);

  async function apply() {
    if (!selStart || !selEnd || !roomTypeId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { startDate: selStart, endDate: selEnd };
      if (dows.length) body.daysOfWeek = dows;
      if (mode === 'set') body.price = Number(price);
      else if (mode === 'adjust') body.adjustPercent = Number(pct);
      else body.reset = true;
      const r = await api<{ count: number }>(`/api/admin/room-types/${roomTypeId}/rates`, { method: 'POST', json: body });
      toast.success(`${r.count} night${r.count === 1 ? '' : 's'} of ${data?.roomType.name} updated`);
      await mutate();
      refresh();
      clear();
      setPrice('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const monthLabel = month ? new Date(`${month}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  const currentMonth = today ? `${today.slice(0, 7)}-01` : '';
  const prices = (data?.days ?? []).filter((d) => d.date.slice(0, 7) === month.slice(0, 7)).map((d) => d.price);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  if (types && types.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <EmptyState
          icon={BedDouble}
          title="Add a room type first"
          description="Rates are set per room type. Create one and its base price fills the calendar."
          action={
            <Button asChild>
              <Link href="/admin/room-types/add">Add room type</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Rates"
        description={data ? `${data.roomType.name} · base ${money(data.roomType.basePrice, { cents: false })} · ${data.roomType.totalRooms} rooms` : 'Nightly prices and demand by room type'}
        actions={
          <>
            {can('agent.use') && (
              <Button variant="ghost" size="sm" className="text-agent hover:bg-agent-soft" onClick={() => askAgent('weekend forecast for the next 3 weekends')}>
                <Sparkles className="h-4 w-4" /> Recommend rates
              </Button>
            )}
            <Select value={roomTypeId} onValueChange={(v) => { setRoomTypeId(v); clear(); }}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Room type" />
              </SelectTrigger>
              <SelectContent>
                {(types ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-40 text-center text-base font-semibold">{monthLabel}</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {month !== currentMonth && (
                <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth)}>
                  Today
                </Button>
              )}
            </div>
            <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-agent" /> Custom price
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-primary/60" /> Sold
              </span>
              {prices.length > 0 && <span className="tabular">{money(minP, { cents: false })}–{money(maxP, { cents: false })}</span>}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {DOW.map((d) => (
              <div key={d} className="pb-1">
                {d}
              </div>
            ))}
          </div>
          {!grid || (isLoading && !data) ? (
            <Skeleton className="h-[480px] rounded-xl" />
          ) : (
            <div className="grid select-none grid-cols-7 gap-1" onMouseLeave={() => setDragging(false)}>
              {grid.cells.map((d) => {
                const r = byDay.get(d);
                const outside = d.slice(0, 7) !== month.slice(0, 7);
                const past = d < today;
                const sel = inSel(d) && (!dows.length || dows.includes(weekday(d)));
                const occ = r && r.total ? r.sold / r.total : 0;
                const wknd = weekday(d) === 5 || weekday(d) === 6;
                const isToday = d === today;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!editable || past}
                    aria-label={`${fmtDay(d, 'weekday')}: ${r ? money(r.price, { cents: false }) : ''}${r?.isCustom ? ' (custom)' : ''}, ${r?.sold ?? 0} of ${r?.total ?? 0} sold`}
                    aria-pressed={sel}
                    onMouseDown={(e) => {
                      if (past || !editable) return;
                      if (e.shiftKey && anchor) {
                        setFocus(d);
                        return;
                      }
                      setAnchor(d);
                      setFocus(d);
                      setDragging(true);
                      setPrice('');
                    }}
                    onMouseEnter={() => dragging && !past && setFocus(d)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (anchor && e.shiftKey) setFocus(d);
                        else {
                          setAnchor(d);
                          setFocus(d);
                          setPrice('');
                        }
                      }
                    }}
                    className={cn(
                      'relative flex h-[76px] flex-col rounded-lg border p-1.5 text-left transition-colors sm:h-20 sm:p-2',
                      outside ? 'border-transparent bg-transparent opacity-40' : wknd ? 'bg-agent-soft/30' : 'bg-card',
                      past && 'cursor-default opacity-50',
                      !past && editable && !sel && 'hover:border-primary/40',
                      sel && 'border-primary bg-primary-soft ring-1 ring-primary',
                      isToday && !sel && 'border-primary/50'
                    )}
                  >
                    <span className={cn('text-[11px] tabular', isToday ? 'font-semibold text-primary' : 'text-muted-foreground')}>{Number(d.slice(8))}</span>
                    {r && (
                      <>
                        <span className={cn('mt-auto text-sm font-semibold tabular sm:text-[15px]', r.isCustom && 'text-agent')}>
                          {sel && mode !== 'reset' && (mode === 'adjust' || price) ? money(preview(r), { cents: false }) : money(r.price, { cents: false })}
                        </span>
                        <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <span className={cn('block h-full rounded-full', occ >= 0.85 ? 'bg-success' : 'bg-primary/60')} style={{ width: `${occ * 100}%` }} />
                        </span>
                        {r.isCustom && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-agent" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {editable ? 'Drag across nights (or click, then shift-click) to edit a range.' : 'You can view rates; ask a manager to change them.'}
          </p>
        </Card>

        {/* Editor */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <AnimatePresence mode="wait">
            {selStart && selEnd ? (
              <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selStart === selEnd ? fmtDay(selStart, 'weekday') : fmtRange(selStart, selEnd)}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedNights.length} night{selectedNights.length === 1 ? '' : 's'} · {data?.roomType.name}
                      </p>
                    </div>
                    <button onClick={clear} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Clear selection">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <SegmentedControl
                    layoutId="rate-edit-mode"
                    aria-label="Edit type"
                    size="sm"
                    className="mt-4 w-full [&>button]:flex-1"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: 'set', label: 'Set price' },
                      { value: 'adjust', label: 'Adjust %' },
                      { value: 'reset', label: 'Reset' },
                    ]}
                  />

                  <div className="mt-4">
                    {mode === 'set' && (
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="pl-7 text-lg font-semibold" aria-label="Nightly price" autoFocus />
                      </div>
                    )}
                    {mode === 'adjust' && (
                      <div className="flex items-center gap-2">
                        {[-15, -10, 10, 15, 25].map((p) => (
                          <button
                            key={p}
                            onClick={() => setPct(String(p))}
                            className={cn('flex-1 rounded-lg border py-1.5 text-xs font-medium tabular transition-colors', String(p) === pct ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-accent')}
                          >
                            {p > 0 ? '+' : ''}
                            {p}%
                          </button>
                        ))}
                      </div>
                    )}
                    {mode === 'reset' && (
                      <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" /> Back to the base price of {money(data?.roomType.basePrice ?? 0, { cents: false })}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="mb-1.5 text-xs text-muted-foreground">Only on</p>
                    <div className="grid grid-cols-7 gap-1">
                      {DOW.map((d, i) => {
                        const js = DOW_JS[i];
                        const on = dows.includes(js);
                        return (
                          <button
                            key={d}
                            onClick={() => setDows((cur) => (on ? cur.filter((x) => x !== js) : [...cur, js]))}
                            className={cn('rounded-md border py-1 text-[11px] font-medium transition-colors', on ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-accent')}
                          >
                            {d.slice(0, 2)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{dows.length ? 'Other nights in the range stay as they are.' : 'Every night in the range.'}</p>
                  </div>

                  {selectedNights.length > 0 && (
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Avg / night</span>
                      <span className="tabular">
                        {money(before / selectedNights.length, { cents: false })} → <span className="font-semibold">{money(after / selectedNights.length, { cents: false })}</span>
                      </span>
                    </div>
                  )}

                  <Button className="mt-4 w-full" onClick={apply} loading={saving} disabled={!selectedNights.length || (mode === 'set' && !(Number(price) >= 0 && price !== ''))}>
                    Apply to {selectedNights.length} night{selectedNights.length === 1 ? '' : 's'}
                  </Button>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="p-5">
                  <p className="text-sm font-semibold">Edit prices</p>
                  <p className="mt-1 text-sm text-muted-foreground">Select nights on the calendar to set a price, adjust by a percentage, or reset to the base rate.</p>
                  {can('agent.use') && (
                    <div className="mt-4 rounded-xl bg-agent-soft/60 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-agent">
                        <Sparkles className="h-3.5 w-3.5" /> Or just say it
                      </p>
                      <button
                        className="mt-1.5 text-left text-sm hover:underline"
                        onClick={() => askAgent(`raise ${data?.roomType.name ?? 'weekend'} rates 10% for the next 2 weekends`)}
                      >
                        “Raise {data?.roomType.name ?? 'weekend'} rates 10% for the next 2 weekends”
                      </button>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
