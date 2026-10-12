'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChipInput } from './ChipInput';

export interface RoomTypeDraft {
  name: string;
  description: string;
  capacity: string;
  basePrice: string;
  totalRooms: string;
  amenities: string[];
}

export const EMPTY_ROOM_TYPE: RoomTypeDraft = { name: '', description: '', capacity: '2', basePrice: '', totalRooms: '', amenities: [] };

export const AMENITY_SUGGESTIONS = [
  'Wi-Fi',
  'King bed',
  'Queen bed',
  'Two queens',
  'Ocean view',
  'Garden view',
  'Balcony',
  'Kitchenette',
  'Air conditioning',
  'Rain shower',
  'Bathtub',
  'Smart TV',
  'Coffee maker',
  'Mini fridge',
  'Workspace',
  'Pet friendly',
];

export function validateRoomType(d: RoomTypeDraft): string | null {
  if (d.name.trim().length < 2) return 'Give the room type a name.';
  if (!(Number(d.capacity) >= 1)) return 'How many guests can stay?';
  if (d.basePrice === '' || !(Number(d.basePrice) >= 0)) return 'Set a nightly base price.';
  if (d.totalRooms !== '' && !(Number(d.totalRooms) >= 0)) return 'Room count must be zero or more.';
  return null;
}

export function RoomTypeFields({ value, onChange, showCount = true }: { value: RoomTypeDraft; onChange: (v: RoomTypeDraft) => void; showCount?: boolean }) {
  const set = <K extends keyof RoomTypeDraft>(k: K, v: RoomTypeDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <Field label="Name" htmlFor="rt-name" hint="What guests see when they book, e.g. “Ocean King” or “Family Suite”.">
        <Input id="rt-name" value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="Ocean King" maxLength={80} />
      </Field>
      <Field label="Description" htmlFor="rt-desc" hint="Two or three sentences: the bed, the view, what makes it special.">
        <Textarea id="rt-desc" rows={3} value={value.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sleeps" htmlFor="rt-cap">
          <Input id="rt-cap" type="number" min={1} max={20} value={value.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </Field>
        <Field label="Base price / night" htmlFor="rt-price">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="rt-price" type="number" min={0} value={value.basePrice} onChange={(e) => set('basePrice', e.target.value)} className="pl-7" placeholder="189" />
          </div>
        </Field>
        {showCount && (
          <Field label="Rooms of this type" htmlFor="rt-count">
            <Input id="rt-count" type="number" min={0} value={value.totalRooms} onChange={(e) => set('totalRooms', e.target.value)} placeholder="10" />
          </Field>
        )}
      </div>
      <Field label="Amenities" htmlFor="rt-amen">
        <ChipInput id="rt-amen" value={value.amenities} onChange={(v) => set('amenities', v)} suggestions={AMENITY_SUGGESTIONS} placeholder="Type and press Enter" />
      </Field>
    </div>
  );
}
