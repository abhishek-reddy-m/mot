'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/fetcher';
import { parseRoomNumbers } from '@/lib/rooms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/primitives';
import { EMPTY_ROOM_TYPE, RoomTypeFields, validateRoomType, type RoomTypeDraft } from '@/components/setup/RoomTypeFields';
import { useConsole } from '@/components/console/ConsoleProvider';

export default function AddRoomTypePage() {
  const router = useRouter();
  const { property, propertyId, refresh } = useConsole();
  const [draft, setDraft] = React.useState<RoomTypeDraft>(EMPTY_ROOM_TYPE);
  const [numbers, setNumbers] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const parsed = numbers.trim() ? parseRoomNumbers(numbers) : null;
  const roomNumbers = parsed && 'numbers' in parsed ? parsed.numbers : [];
  const numbersError = parsed && 'error' in parsed ? parsed.error : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateRoomType(draft) ?? numbersError;
    setError(problem);
    if (problem || !propertyId) return;
    setSaving(true);
    try {
      const totalRooms = Math.max(Number(draft.totalRooms || 0), roomNumbers.length);
      const created = await api<{ id: string; name: string }>('/api/admin/room-types', {
        method: 'POST',
        json: {
          propertyId,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          capacity: Number(draft.capacity),
          basePrice: Number(draft.basePrice),
          totalRooms,
          amenities: draft.amenities,
        },
      });
      if (roomNumbers.length) {
        try {
          await api('/api/admin/rooms', { method: 'POST', json: { propertyId, roomTypeId: created.id, roomNumbers } });
        } catch (err) {
          toast.error(`Room type saved, but rooms weren’t added: ${(err as Error).message}`);
        }
      }
      toast.success(`${created.name} is ready to sell`);
      refresh();
      router.push(`/admin/room-types/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/admin/room-types" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Rooms
      </Link>
      <PageHeader title="New room type" description={property ? `For ${property.name}. You can add photos and adjust rates right after.` : undefined} />

      <form onSubmit={save} className="space-y-6">
        <Card className="p-5 sm:p-6">
          <RoomTypeFields value={draft} onChange={setDraft} />
        </Card>

        <Card className="p-5 sm:p-6">
          <Field
            label="Room numbers (optional)"
            htmlFor="rt-numbers"
            hint={numbersError ?? (roomNumbers.length ? `${roomNumbers.length} rooms: ${roomNumbers.slice(0, 10).join(', ')}${roomNumbers.length > 10 ? '…' : ''}` : 'Ranges and lists both work, like “101-110, 201”. Floors are read from the number.')}
            error={numbersError ?? undefined}
          >
            <Input id="rt-numbers" value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="101-110" />
          </Field>
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
            Create room type
          </Button>
        </div>
      </form>
    </div>
  );
}
