'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/primitives';
import { EMPTY_PROPERTY, PropertyFields, toPropertyPayload, validateProperty, type PropertyDraft } from '@/components/setup/PropertyFields';
import { useConsole } from '@/components/console/ConsoleProvider';

export default function AddPropertyPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { setPropertyId } = useConsole();
  const [draft, setDraft] = React.useState<PropertyDraft>(EMPTY_PROPERTY);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateProperty(draft);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      const created = await api<{ id: string; name: string }>('/api/admin/properties', { method: 'POST', json: toPropertyPayload(draft) });
      await mutate('/api/admin/context');
      setPropertyId(created.id);
      toast.success(`${created.name} created — now add its rooms`);
      router.push('/admin/room-types/add');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/admin/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Properties
      </Link>
      <PageHeader title="Add a property" description="The basics guests need. Rooms, photos and rates come next." />
      <form onSubmit={save} className="space-y-6">
        <Card className="p-5 sm:p-8">
          <PropertyFields value={draft} onChange={setDraft} />
        </Card>
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create property
          </Button>
        </div>
      </form>
    </div>
  );
}
