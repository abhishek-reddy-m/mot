'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, AudioLines, Check, Cloud, Laptop, Phone, Plus, Rocket, ServerCog, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRAND_SWATCHES, PROPERTY_TYPES } from '@/components/setup/PropertyFields';

type Path = 'FULL' | 'BRIDGE' | 'VOICE';
interface RoomDraft {
  name: string;
  capacity: string;
  basePrice: string;
  totalRooms: string;
}

const PATHS: { id: Path; icon: React.ElementType; title: string; text: string }[] = [
  { id: 'FULL', icon: Rocket, title: 'Run my hotel on StayOS', text: 'Booking site, front desk, housekeeping, rates and the agent.' },
  { id: 'BRIDGE', icon: ServerCog, title: 'Keep my current system', text: 'The agent works your existing PMS for you. Move over any time.' },
  { id: 'VOICE', icon: AudioLines, title: 'Just the voice agent', text: 'Answer guest questions by voice with your real rooms and prices.' },
];
const SYSTEMS = ['Cloudbeds', 'Mews', 'Oracle OPERA Cloud', 'Little Hotelier', 'RoomRaccoon', 'eZee Absolute', 'innRoad', 'WebRezPro', 'SkyTouch', 'Hotelogix', 'Other'];
const VOICES = ['marin', 'cedar', 'willow', 'coral', 'sage', 'verse'];

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              i < current ? 'bg-primary text-primary-foreground' : i === current ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : 'bg-muted text-muted-foreground'
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={cn('hidden text-sm sm:inline', i === current ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function Preview({ path, name, tagline, color, rooms, greeting, system, mode }: { path: Path; name: string; tagline: string; color: string; rooms: RoomDraft[]; greeting: string; system: string; mode: string }) {
  const hotel = name || 'Your hotel';
  if (path === 'VOICE') {
    return (
      <div className="flex flex-col items-center text-center text-white">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
          <span className="absolute inset-2 rounded-full bg-white/25 backdrop-blur" />
          <AudioLines className="relative h-10 w-10" />
        </span>
        <p className="mt-8 text-sm text-white/70">Guests hear</p>
        <p className="mt-2 max-w-sm font-display text-2xl leading-snug">“{greeting || `Thanks for calling ${hotel} — how can I help?`}”</p>
        <p className="mt-6 max-w-xs text-sm text-white/80">Then it answers with live prices and availability, and takes messages for your team.</p>
      </div>
    );
  }
  if (path === 'BRIDGE') {
    return (
      <div className="w-full max-w-sm text-white">
        <p className="text-sm text-white/70">How it works</p>
        <div className="mt-4 space-y-3">
          {[
            { icon: Sparkles, t: 'You ask', d: '“Check in the Smiths in 204”' },
            { icon: Check, t: 'You confirm', d: 'Every change waits for your yes' },
            { icon: mode === 'CLOUD' ? Cloud : Laptop, t: `StayOS works ${system || 'your PMS'}`, d: mode === 'CLOUD' ? 'In a secure cloud browser' : 'From your front-desk computer' },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur">
              <s.icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{s.t}</p>
                <p className="text-sm text-white/75">{s.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-slate-900 shadow-float">
      <div className="h-24" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }} />
      <div className="p-5">
        <p className="font-display text-2xl leading-tight">{hotel}</p>
        <p className="mt-1 text-sm text-slate-500">{tagline || 'Your tagline here'}</p>
        <div className="mt-4 space-y-2">
          {(rooms.filter((r) => r.name).length ? rooms.filter((r) => r.name) : [{ name: 'Deluxe King', basePrice: '189' } as RoomDraft]).slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <span>{r.name}</span>
              <span className="font-semibold" style={{ color }}>
                ${r.basePrice || '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg py-2 text-center text-sm font-medium text-white" style={{ backgroundColor: color }}>
          Book now
        </div>
      </div>
    </div>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPath = (['FULL', 'BRIDGE', 'VOICE'] as const).find((p) => p.toLowerCase() === params.get('path')?.toLowerCase());
  const [path, setPath] = React.useState<Path>(initialPath ?? 'FULL');
  const [step, setStep] = React.useState(initialPath ? 1 : 0);
  const [account, setAccount] = React.useState({ firstName: '', lastName: '', email: '', password: '' });
  const [prop, setProp] = React.useState({ name: '', type: 'Hotel', address: '', city: '', state: '', zipCode: '', phone: '', tagline: '', primaryColor: '#0E7490' });
  const [rooms, setRooms] = React.useState<RoomDraft[]>([{ name: '', capacity: '2', basePrice: '', totalRooms: '' }]);
  const [bridge, setBridge] = React.useState({ system: '', other: '', mode: 'DESKTOP' as 'DESKTOP' | 'CLOUD', loginUrl: '' });
  const [voice, setVoice] = React.useState({ voice: 'marin', greeting: '', handoffPhone: '' });
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const steps = ['Path', 'Account', 'Property', path === 'FULL' ? 'Rooms & brand' : path === 'BRIDGE' ? 'Your system' : 'Voice'];

  function validate(s: number): string | null {
    if (s === 1) {
      if (!account.firstName.trim() || !account.lastName.trim()) return 'Please enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(account.email.trim())) return 'Please enter a valid email address.';
      if (account.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (s === 2) {
      if (prop.name.trim().length < 2) return 'Add your property’s name.';
      if (!prop.address.trim() || !prop.city.trim() || !prop.state.trim() || prop.zipCode.trim().length < 2) return 'Complete the address — guests use it to find you.';
      if (prop.phone.trim().length < 5) return 'Add a phone number.';
    }
    if (s === 3 && path === 'BRIDGE') {
      const sys = bridge.system === 'Other' ? bridge.other.trim() : bridge.system;
      if (!sys) return 'Choose the system you use today.';
      if (bridge.loginUrl && !/^https?:\/\//.test(bridge.loginUrl)) return 'The sign-in address should start with https://';
    }
    if (s === 3) {
      for (const r of rooms.filter((r) => r.name.trim())) if (!(Number(r.basePrice) >= 0) || r.basePrice === '') return `Add a nightly price for ${r.name}.`;
    }
    return null;
  }

  function next() {
    const problem = validate(step);
    setError(problem ?? '');
    if (!problem) setStep((s) => s + 1);
  }

  async function submit() {
    const problem = validate(3);
    setError(problem ?? '');
    if (problem) return;
    setBusy(true);
    try {
      const sys = bridge.system === 'Other' ? bridge.other.trim() : bridge.system;
      const res = await api<{ next: string }>('/api/onboarding', {
        method: 'POST',
        json: {
          path,
          account: { ...account, email: account.email.trim() },
          property: { ...prop, tagline: prop.tagline || null },
          roomTypes: rooms
            .filter((r) => r.name.trim())
            .map((r) => ({ name: r.name.trim(), capacity: Number(r.capacity) || 2, basePrice: Number(r.basePrice), totalRooms: Number(r.totalRooms) || 0 })),
          ...(path === 'BRIDGE' ? { bridge: { system: sys, mode: bridge.mode, loginUrl: bridge.loginUrl.trim() || null } } : {}),
          voice: { voice: voice.voice, greeting: voice.greeting.trim() || null, handoffPhone: voice.handoffPhone.trim() || null },
        },
      });
      const login = await signIn('credentials', { email: account.email.trim().toLowerCase(), password: account.password, redirect: false });
      router.push(login?.error ? '/login?onboarded=1' : res.next);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const setRoom = (i: number, k: keyof RoomDraft, v: string) => setRooms((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="StayOS home">
            <Logo />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Have an account? Sign in
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10">
          <Steps steps={steps} current={step} />
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="mt-8">
              {step === 0 && (
                <>
                  <h1 className="font-display text-3xl tracking-tight sm:text-4xl">How would you like to start?</h1>
                  <p className="mt-2 text-muted-foreground">You can change this later without starting over.</p>
                  <div className="mt-6 space-y-3">
                    {PATHS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPath(p.id)}
                        aria-pressed={path === p.id}
                        className={cn('flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all', path === p.id ? 'border-primary bg-primary-soft/40 ring-1 ring-primary' : 'hover:bg-accent')}
                      >
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', path === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <p.icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">{p.title}</span>
                          <span className="block text-sm text-muted-foreground">{p.text}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 className="font-display text-3xl tracking-tight">Create your account</h1>
                  <p className="mt-2 text-muted-foreground">You’ll be the owner. Invite your team once you’re in.</p>
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="First name" htmlFor="o-first">
                        <Input id="o-first" autoComplete="given-name" value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} />
                      </Field>
                      <Field label="Last name" htmlFor="o-last">
                        <Input id="o-last" autoComplete="family-name" value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Work email" htmlFor="o-email">
                      <Input id="o-email" type="email" autoComplete="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
                    </Field>
                    <Field label="Password" htmlFor="o-pass" hint="At least 8 characters.">
                      <Input id="o-pass" type="password" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="font-display text-3xl tracking-tight">Tell us about your property</h1>
                  <div className="mt-6 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                      <Field label="Property name" htmlFor="o-name">
                        <Input id="o-name" value={prop.name} onChange={(e) => setProp({ ...prop, name: e.target.value })} placeholder="The Saltwater Inn" />
                      </Field>
                      <Field label="Type" htmlFor="o-type">
                        <Select value={prop.type} onValueChange={(v) => setProp({ ...prop, type: v })}>
                          <SelectTrigger id="o-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROPERTY_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Street address" htmlFor="o-addr">
                      <Input id="o-addr" autoComplete="street-address" value={prop.address} onChange={(e) => setProp({ ...prop, address: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="City" htmlFor="o-city">
                        <Input id="o-city" value={prop.city} onChange={(e) => setProp({ ...prop, city: e.target.value })} />
                      </Field>
                      <Field label="State" htmlFor="o-state">
                        <Input id="o-state" value={prop.state} onChange={(e) => setProp({ ...prop, state: e.target.value })} />
                      </Field>
                      <Field label="Postal code" htmlFor="o-zip">
                        <Input id="o-zip" value={prop.zipCode} onChange={(e) => setProp({ ...prop, zipCode: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Front desk phone" htmlFor="o-phone">
                      <Input id="o-phone" type="tel" value={prop.phone} onChange={(e) => setProp({ ...prop, phone: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}

              {step === 3 && path === 'BRIDGE' && (
                <>
                  <h1 className="font-display text-3xl tracking-tight">Which system do you use?</h1>
                  <p className="mt-2 text-muted-foreground">You’ll finish connecting it right after this — it takes about two minutes.</p>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SYSTEMS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setBridge({ ...bridge, system: s })}
                        className={cn('rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all', bridge.system === s ? 'border-primary bg-primary-soft/60 ring-1 ring-primary' : 'hover:bg-accent')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {bridge.system === 'Other' && <Input className="mt-3" value={bridge.other} onChange={(e) => setBridge({ ...bridge, other: e.target.value })} placeholder="Your PMS name" aria-label="PMS name" />}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        { m: 'DESKTOP', icon: Laptop, t: 'From our front-desk computer', d: 'Logins stay at the hotel.' },
                        { m: 'CLOUD', icon: Cloud, t: 'In the StayOS cloud', d: 'Nothing to install.' },
                      ] as const
                    ).map((o) => (
                      <button key={o.m} onClick={() => setBridge({ ...bridge, mode: o.m })} className={cn('flex items-start gap-3 rounded-2xl border p-4 text-left transition-all', bridge.mode === o.m ? 'border-primary bg-primary-soft/40 ring-1 ring-primary' : 'hover:bg-accent')}>
                        <o.icon className={cn('mt-0.5 h-5 w-5', bridge.mode === o.m ? 'text-primary' : 'text-muted-foreground')} />
                        <span>
                          <span className="block text-sm font-semibold">{o.t}</span>
                          <span className="block text-xs text-muted-foreground">{o.d}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <Field label="Sign-in address (optional)" htmlFor="o-url" className="mt-4">
                    <Input id="o-url" type="url" value={bridge.loginUrl} onChange={(e) => setBridge({ ...bridge, loginUrl: e.target.value })} placeholder="https://" />
                  </Field>
                </>
              )}

              {step === 3 && path === 'VOICE' && (
                <>
                  <h1 className="font-display text-3xl tracking-tight">Shape your voice front desk</h1>
                  <div className="mt-6 space-y-4">
                    <Field label="Greeting" htmlFor="o-greet">
                      <Input id="o-greet" value={voice.greeting} onChange={(e) => setVoice({ ...voice, greeting: e.target.value })} placeholder={`Thanks for calling ${prop.name || 'us'} — how can I help?`} />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Voice" htmlFor="o-voice">
                        <Select value={voice.voice} onValueChange={(v) => setVoice({ ...voice, voice: v })}>
                          <SelectTrigger id="o-voice">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VOICES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v[0].toUpperCase() + v.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="When a person is needed" htmlFor="o-hand" hint="Defaults to your front desk number.">
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="o-hand" type="tel" className="pl-9" value={voice.handoffPhone} onChange={(e) => setVoice({ ...voice, handoffPhone: e.target.value })} placeholder={prop.phone} />
                        </div>
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && path !== 'BRIDGE' && (
                <div className={path === 'VOICE' ? 'mt-8' : ''}>
                  {path === 'FULL' && <h1 className="font-display text-3xl tracking-tight">Your rooms and brand</h1>}
                  <p className={cn('text-sm text-muted-foreground', path === 'FULL' ? 'mt-2' : 'font-medium text-foreground')}>
                    {path === 'FULL' ? 'Add your room types now or later — prices can vary by night afterwards.' : 'Room types and starting prices (so the voice can quote you)'}
                  </p>
                  <div className="mt-4 space-y-2">
                    {rooms.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_64px_88px_64px_auto] sm:border-0 sm:p-0">
                        <Field label={i === 0 ? 'Room type' : ''} htmlFor={`rt-n-${i}`} className="col-span-4 sm:col-span-1">
                          <Input id={`rt-n-${i}`} value={r.name} onChange={(e) => setRoom(i, 'name', e.target.value)} placeholder="Ocean King" />
                        </Field>
                        <Field label={i === 0 ? 'Sleeps' : ''} htmlFor={`rt-c-${i}`}>
                          <Input id={`rt-c-${i}`} type="number" min={1} value={r.capacity} onChange={(e) => setRoom(i, 'capacity', e.target.value)} />
                        </Field>
                        <Field label={i === 0 ? '$ / night' : ''} htmlFor={`rt-p-${i}`}>
                          <Input id={`rt-p-${i}`} type="number" min={0} value={r.basePrice} onChange={(e) => setRoom(i, 'basePrice', e.target.value)} placeholder="189" />
                        </Field>
                        <Field label={i === 0 ? 'Rooms' : ''} htmlFor={`rt-t-${i}`}>
                          <Input id={`rt-t-${i}`} type="number" min={0} value={r.totalRooms} onChange={(e) => setRoom(i, 'totalRooms', e.target.value)} placeholder="10" />
                        </Field>
                        <Button variant="ghost" size="icon" onClick={() => setRooms((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ name: '', capacity: '2', basePrice: '', totalRooms: '' }]))} aria-label="Remove room type">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {rooms.length < 8 && (
                      <Button variant="ghost" size="sm" onClick={() => setRooms((rs) => [...rs, { name: '', capacity: '2', basePrice: '', totalRooms: '' }])}>
                        <Plus className="h-4 w-4" /> Another room type
                      </Button>
                    )}
                  </div>
                  {path === 'FULL' && (
                    <div className="mt-6 space-y-4">
                      <Field label="Tagline" htmlFor="o-tag">
                        <Input id="o-tag" value={prop.tagline} onChange={(e) => setProp({ ...prop, tagline: e.target.value })} placeholder="Coastal calm, two blocks from the beach" />
                      </Field>
                      <div>
                        <p className="text-[13px] font-medium">Brand colour</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {BRAND_SWATCHES.map((c) => (
                            <button key={c} onClick={() => setProp({ ...prop, primaryColor: c })} className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110', prop.primaryColor === c && 'ring-2 ring-foreground/40')} style={{ backgroundColor: c }} aria-label={`Use ${c}`}>
                              {prop.primaryColor === c && <Check className="h-4 w-4 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-6 rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => { setError(''); setStep((s) => s - 1); }}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={next} size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} size="lg" loading={busy}>
                {path === 'FULL' ? 'Launch my hotel' : path === 'BRIDGE' ? 'Connect my system' : 'Start my voice agent'} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Free to start · no card needed · you can switch paths later</p>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <div className="bg-aurora animate-aurora absolute inset-0 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="relative flex h-full items-center justify-center p-12">
          <Preview path={path} name={prop.name} tagline={prop.tagline} color={prop.primaryColor} rooms={rooms} greeting={voice.greeting} system={bridge.system === 'Other' ? bridge.other : bridge.system} mode={bridge.mode} />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense>
      <Onboarding />
    </React.Suspense>
  );
}
