'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { KeyRound, UserRound } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { SiteFooter } from '@/components/guest/SiteFooter';
import { roleLabel } from '@/lib/status';

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  role: string;
  createdAt: string;
}

type Draft = Record<'firstName' | 'lastName' | 'phone' | 'address' | 'city' | 'state' | 'zipCode' | 'country', string>;

const toDraft = (p: Profile): Draft => ({
  firstName: p.firstName,
  lastName: p.lastName,
  phone: p.phone ?? '',
  address: p.address ?? '',
  city: p.city ?? '',
  state: p.state ?? '',
  zipCode: p.zipCode ?? '',
  country: p.country ?? '',
});

export default function ProfilePage() {
  const { data, mutate } = useSWR<Profile>('/api/profile', fetcher);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pw, setPw] = React.useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = React.useState(false);

  React.useEffect(() => {
    if (data && !draft) setDraft(toDraft(data));
  }, [data, draft]);

  const dirty = data && draft && JSON.stringify(draft) !== JSON.stringify(toDraft(data));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => draft && setDraft({ ...draft, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const fresh = await api<Profile>('/api/profile', { method: 'PUT', json: draft });
      await mutate(fresh, { revalidate: false });
      setDraft(toDraft(fresh));
      toast.success('Profile saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    try {
      await api('/api/profile', { method: 'PUT', json: pw });
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navigation variant="guest" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 pb-16 pt-6 sm:px-6">
        {!data || !draft ? (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Avatar name={`${data.firstName} ${data.lastName}`} size="lg" />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {data.firstName} {data.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.email}
                  {data.role !== 'CUSTOMER' && ` · ${roleLabel(data.role)}`}
                </p>
              </div>
            </div>

            <form onSubmit={save} className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="h-4 w-4 text-muted-foreground" /> Your details
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Hotels see these on your reservations.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="pf-first">
                  <Input id="pf-first" required value={draft.firstName} onChange={set('firstName')} autoComplete="given-name" />
                </Field>
                <Field label="Last name" htmlFor="pf-last">
                  <Input id="pf-last" required value={draft.lastName} onChange={set('lastName')} autoComplete="family-name" />
                </Field>
                <Field label="Phone" htmlFor="pf-phone">
                  <Input id="pf-phone" type="tel" value={draft.phone} onChange={set('phone')} autoComplete="tel" />
                </Field>
                <Field label="Email" htmlFor="pf-email" hint="Contact the hotel or support to change it.">
                  <Input id="pf-email" value={data.email} disabled />
                </Field>
                <Field label="Address" htmlFor="pf-addr" className="sm:col-span-2">
                  <Input id="pf-addr" value={draft.address} onChange={set('address')} autoComplete="street-address" />
                </Field>
                <Field label="City" htmlFor="pf-city">
                  <Input id="pf-city" value={draft.city} onChange={set('city')} autoComplete="address-level2" />
                </Field>
                <Field label="State / region" htmlFor="pf-state">
                  <Input id="pf-state" value={draft.state} onChange={set('state')} autoComplete="address-level1" />
                </Field>
                <Field label="Postal code" htmlFor="pf-zip">
                  <Input id="pf-zip" value={draft.zipCode} onChange={set('zipCode')} autoComplete="postal-code" />
                </Field>
                <Field label="Country" htmlFor="pf-country">
                  <Input id="pf-country" value={draft.country} onChange={set('country')} autoComplete="country-name" />
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                {dirty && (
                  <Button type="button" variant="ghost" onClick={() => setDraft(toDraft(data))}>
                    Discard
                  </Button>
                )}
                <Button type="submit" loading={saving} disabled={!dirty}>
                  Save changes
                </Button>
              </div>
            </form>

            <form onSubmit={changePassword} className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="h-4 w-4 text-muted-foreground" /> Password
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Current password" htmlFor="pf-cur">
                  <Input id="pf-cur" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
                </Field>
                <Field label="New password" htmlFor="pf-new" hint="At least 8 characters.">
                  <Input id="pf-new" type="password" required minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                </Field>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit" variant="outline" loading={pwBusy} disabled={!pw.currentPassword || pw.newPassword.length < 8}>
                  Change password
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
