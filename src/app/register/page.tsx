'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Eye, EyeOff, Luggage } from 'lucide-react';
import { api } from '@/lib/fetcher';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';

function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/admin')) return '/dashboard';
  return raw;
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callback = safeCallback(params.get('callbackUrl'));
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/api/auth/register', { method: 'POST', json: form });
      const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (!res || res.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
        return;
      }
      router.replace(callback);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Manage bookings, change dates and check in faster next time.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="r-first">
            <Input id="r-first" required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} />
          </Field>
          <Field label="Last name" htmlFor="r-last">
            <Input id="r-last" required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
          </Field>
        </div>
        <Field label="Email" htmlFor="r-email">
          <Input id="r-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="Phone (optional)" htmlFor="r-phone">
          <Input id="r-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Password" htmlFor="r-pass" hint="At least 8 characters.">
          <div className="relative">
            <Input id="r-pass" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} className="pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callback)}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Running a hotel?{' '}
        <Link href="/onboarding" className="font-medium text-primary hover:underline">
          Set up your property instead
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <AuthLayout
      aside={
        <div className="max-w-md">
          <Luggage className="h-8 w-8 opacity-90" />
          <p className="mt-6 font-display text-3xl leading-tight">Book direct. Change your mind for free until the day before.</p>
          <p className="mt-4 text-sm text-white/80">One account for every StayOS hotel — your confirmations, directions and receipts in one place.</p>
        </div>
      }
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
