'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { ArrowRight, ConciergeBell, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { canAccessConsolePath, homeForRole, isStaffRole } from '@/lib/routes';

const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'false');

const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@stayos.demo', hint: 'Everything, incl. rates & team' },
  { label: 'Front desk', email: 'frontdesk@stayos.demo', hint: 'Arrivals, check-in, the agent' },
  { label: 'Housekeeping', email: 'housekeeping@stayos.demo', hint: 'Mobile room list' },
  { label: 'Guest', email: 'guest@stayos.demo', hint: 'Trips & booking flow' },
];

/** Only same-site relative paths are accepted as a post-login destination. */
function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (raw.startsWith('/login') || raw.startsWith('/register')) return null;
  return raw;
}

function destinationFor(role: string | undefined, callback: string | null): string {
  if (callback) {
    const isConsole = callback.startsWith('/admin');
    if (!isConsole) return callback;
    if (isStaffRole(role) && (callback === '/admin' || canAccessConsolePath(role, callback))) return callback;
  }
  // Staff land on /admin, which opens their preferred surface (Classic or Agentic).
  return isStaffRole(role) ? '/admin' : homeForRole(role);
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callback = safeCallback(params.get('callbackUrl'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email: creds?.email ?? email, password: creds?.password ?? password, redirect: false });
    if (!res || res.error) {
      setError('That email and password don’t match an account.');
      setLoading(false);
      return;
    }
    const session = await getSession();
    router.replace(destinationFor(session?.user?.role, callback));
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Guests and hotel teams sign in here — we’ll take you to the right place.</p>

      <form onSubmit={login} className="mt-8 space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href={`/register${callback ? `?callbackUrl=${encodeURIComponent(callback)}` : ''}`} className="font-medium text-primary hover:underline">
          Create a guest account
        </Link>{' '}
        or{' '}
        <Link href="/onboarding" className="font-medium text-primary hover:underline">
          set up your hotel
        </Link>
      </p>

      {DEMO_ENABLED && (
        <div className="mt-10 rounded-2xl border bg-surface-sunken/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-agent" /> Explore the demo — one click, password demo1234
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={loading}
                onClick={() => login(undefined, { email: a.email, password: 'demo1234' })}
                className="rounded-xl border bg-card px-3 py-2 text-left transition-all hover:-translate-y-px hover:shadow-soft disabled:opacity-60"
              >
                <span className="block text-sm font-medium">{a.label}</span>
                <span className="block text-[11px] text-muted-foreground">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      aside={
        <div className="max-w-md">
          <ConciergeBell className="h-8 w-8 opacity-90" />
          <p className="mt-6 font-display text-3xl leading-tight">“Check in the Smiths, quiet room on a high floor — and note it’s their anniversary.”</p>
          <p className="mt-4 text-sm text-white/80">One sentence. The agent finds the reservation, picks the room, writes the note — and waits for your OK.</p>
        </div>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
