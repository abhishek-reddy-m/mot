'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChipInput } from './ChipInput';

export interface PropertyDraft {
  name: string;
  type: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  amenities: string[];
  primaryColor: string;
}

export const EMPTY_PROPERTY: PropertyDraft = {
  name: '',
  type: 'Hotel',
  tagline: '',
  description: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  email: '',
  amenities: [],
  primaryColor: '#0E7490',
};

export const PROPERTY_TYPES = ['Hotel', 'Motel', 'Inn', 'B&B', 'Boutique', 'Other'];
export const BRAND_SWATCHES = ['#0E7490', '#1D4ED8', '#7C3AED', '#BE185D', '#B45309', '#15803D', '#0F172A', '#9F1239'];
const PROPERTY_AMENITIES = ['Free Wi-Fi', 'Parking', 'Pool', 'Breakfast', 'Fitness center', 'Spa', 'Restaurant', 'Bar', 'Pet friendly', 'Beach access', 'EV charging', 'Airport shuttle'];

export function toPropertyPayload(d: PropertyDraft) {
  return {
    name: d.name.trim(),
    type: d.type || 'Hotel',
    tagline: d.tagline.trim() || null,
    description: d.description.trim() || null,
    address: d.address.trim(),
    city: d.city.trim(),
    state: d.state.trim(),
    zipCode: d.zipCode.trim(),
    phone: d.phone.trim(),
    email: d.email.trim() || null,
    amenities: d.amenities,
    primaryColor: d.primaryColor || null,
  };
}

export function validateProperty(d: PropertyDraft): string | null {
  if (d.name.trim().length < 2) return 'Add your property’s name.';
  if (d.address.trim().length < 3 || !d.city.trim() || !d.state.trim() || d.zipCode.trim().length < 2) return 'Complete the address — guests use it to find you.';
  if (d.phone.trim().length < 5) return 'Add a phone number guests can call.';
  if (d.email.trim() && !/^\S+@\S+\.\S+$/.test(d.email.trim())) return 'That email address doesn’t look right.';
  if (d.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(d.primaryColor)) return 'Brand colour must be a hex value like #0E7490.';
  return null;
}

export function BrandColorPicker({ value, onChange, name }: { value: string; onChange: (v: string) => void; name?: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap gap-2">
          {BRAND_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110', value.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground/40')}
              style={{ backgroundColor: c }}
              aria-label={`Use ${c}`}
            >
              {value.toLowerCase() === c.toLowerCase() && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
          <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed text-[10px] text-muted-foreground hover:border-primary/50" title="Custom colour">
            <input type="color" value={valid ? value : '#0E7490'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
            +
          </label>
        </div>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-3 w-32 font-mono text-sm uppercase" aria-label="Brand colour hex" maxLength={7} />
      </div>
      {/* Live preview of the guest booking page accent */}
      <div className="w-full rounded-xl border bg-white p-3 text-slate-900 shadow-xs sm:w-56">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Preview</p>
        <p className="mt-1 truncate font-display text-base">{name || 'Your hotel'}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: valid ? value : '#0E7490' }}>
            Book now
          </span>
          <span className="text-xs font-medium" style={{ color: valid ? value : '#0E7490' }}>
            $189 / night
          </span>
        </div>
      </div>
    </div>
  );
}

export function PropertyFields({ value, onChange }: { value: PropertyDraft; onChange: (v: PropertyDraft) => void }) {
  const set = <K extends keyof PropertyDraft>(k: K, v: PropertyDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Property name" htmlFor="p-name">
            <Input id="p-name" value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="The Saltwater Inn" maxLength={120} />
          </Field>
          <Field label="Type" htmlFor="p-type">
            <Select value={value.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger id="p-type">
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
        <Field label="Tagline" htmlFor="p-tag" hint="One line under your name on the booking page.">
          <Input id="p-tag" value={value.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Coastal calm, two blocks from the beach" maxLength={160} />
        </Field>
        <Field label="Description" htmlFor="p-desc">
          <Textarea id="p-desc" rows={4} value={value.description} onChange={(e) => set('description', e.target.value)} maxLength={4000} />
        </Field>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold">Location & contact</p>
        <Field label="Street address" htmlFor="p-addr">
          <Input id="p-addr" value={value.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="p-city">
            <Input id="p-city" value={value.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
          </Field>
          <Field label="State / region" htmlFor="p-state">
            <Input id="p-state" value={value.state} onChange={(e) => set('state', e.target.value)} autoComplete="address-level1" />
          </Field>
          <Field label="Postal code" htmlFor="p-zip">
            <Input id="p-zip" value={value.zipCode} onChange={(e) => set('zipCode', e.target.value)} autoComplete="postal-code" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="p-phone">
            <Input id="p-phone" type="tel" value={value.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
          </Field>
          <Field label="Email (optional)" htmlFor="p-email">
            <Input id="p-email" type="email" value={value.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold">Amenities</p>
        <ChipInput value={value.amenities} onChange={(v) => set('amenities', v)} suggestions={PROPERTY_AMENITIES} placeholder="Type and press Enter" />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Brand colour</p>
          <p className="text-xs text-muted-foreground">Used for buttons and accents on your guest booking pages.</p>
        </div>
        <BrandColorPicker value={value.primaryColor} onChange={(v) => set('primaryColor', v)} name={value.name} />
      </div>
    </div>
  );
}
