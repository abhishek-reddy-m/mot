'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpRight, TriangleAlert } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { PhotoManager } from '@/components/setup/PhotoManager';
import { EMPTY_PROPERTY, PropertyFields, toPropertyPayload, validateProperty, type PropertyDraft } from '@/components/setup/PropertyFields';
import { ConfirmDialog } from '@/components/frontdesk/dialogs';
import { useConsole } from '@/components/console/ConsoleProvider';

interface PropertyDetail {
  id: string;
  name: string;
  type: string | null;
  tagline: string | null;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string | null;
  amenities: string[];
  primaryColor: string | null;
  isActive: boolean;
  isDemo: boolean;
  _count: { rooms: number; bookings: number };
}

function toDraft(p: PropertyDetail): PropertyDraft {
  return {
    ...EMPTY_PROPERTY,
    name: p.name,
    type: p.type ?? 'Hotel',
    tagline: p.tagline ?? '',
    description: p.description ?? '',
    address: p.address,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    phone: p.phone,
    email: p.email ?? '',
    amenities: p.amenities,
    primaryColor: p.primaryColor ?? EMPTY_PROPERTY.primaryColor,
  };
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const { can } = useConsole();
  const url = `/api/admin/properties/${propertyId}`;
  const { data: p, error, mutate } = useSWR<PropertyDetail>(url, fetcher);
  const [draft, setDraft] = React.useState<PropertyDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirm, setConfirm] = React.useState<'deactivate' | 'delete' | null>(null);
  const [busy, setBusy] = React.useState(false);
  const editable = can('property.write');

  React.useEffect(() => {
    if (p && !draft) setDraft(toDraft(p));
  }, [p, draft]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <EmptyState icon={TriangleAlert} title="Property not found" description={(error as Error).message} />
      </div>
    );
  }
  if (!p || !draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(p));

  async function save() {
    if (!draft || !p) return;
    const problem = validateProperty(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await api(url, { method: 'PUT', json: { ...toPropertyPayload(draft), isActive: p.isActive } });
      const fresh = await mutate();
      if (fresh) setDraft(toDraft(fresh));
      await globalMutate('/api/admin/context');
      toast.success('Property saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(isActive: boolean) {
    if (!p) return;
    setBusy(true);
    try {
      await api(url, { method: 'PUT', json: { ...toPropertyPayload(toDraft(p)), isActive } });
      await mutate();
      toast.success(isActive ? `${p.name} is accepting bookings again` : `${p.name} is hidden from guests`);
      setConfirm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(url, { method: 'DELETE' });
      await globalMutate('/api/admin/context');
      toast.success('Property deleted');
      router.push('/admin/properties');
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-28">
      <Link href="/admin/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Properties
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{p.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {p._count.rooms} rooms · {p._count.bookings} bookings{!p.isActive && ' · hidden from guests'}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/properties/${p.id}`} target="_blank">
            View booking page <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="p-5 sm:p-8">
        <fieldset disabled={!editable}>
          <PropertyFields value={draft} onChange={setDraft} />
        </fieldset>
      </Card>

      <Card className="p-5 sm:p-8">
        <p className="text-sm font-semibold">Photos</p>
        <p className="mb-4 text-xs text-muted-foreground">Your cover photo is the first thing guests see.</p>
        <PhotoManager endpoint={`/api/admin/properties/${p.id}/photos`} editable={editable} />
      </Card>

      {editable && (
        <Card className="border-destructive/20 p-5 sm:p-8">
          <p className="text-sm font-semibold">Availability</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {p.isActive ? 'Guests can find and book this property.' : 'Hidden from the directory; existing reservations are unaffected.'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => (p.isActive ? setConfirm('deactivate') : setActive(true))} loading={busy && confirm === null}>
                {p.isActive ? 'Stop taking bookings' : 'Start taking bookings'}
              </Button>
              {can('property.delete') && !p.isDemo && (
                <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setConfirm('delete')}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 px-4 py-3 backdrop-blur transition-transform duration-300 lg:left-[248px]',
          dirty && editable ? 'translate-y-0' : 'translate-y-full'
        )}
        aria-hidden={!dirty}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(toDraft(p))}>
              Discard
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'delete' ? `Delete ${p.name}?` : `Stop taking bookings at ${p.name}?`}
        description={
          confirm === 'delete'
            ? 'Only possible without booking history. Rooms, rates and photos are removed permanently.'
            : 'The property disappears from search and its booking page. Staff can keep working with existing reservations.'
        }
        confirmLabel={confirm === 'delete' ? 'Delete property' : 'Stop bookings'}
        destructive
        loading={busy}
        onConfirm={() => (confirm === 'delete' ? remove() : setActive(false))}
      />
    </div>
  );
}
