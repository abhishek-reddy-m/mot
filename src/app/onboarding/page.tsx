'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/product';

const PROPERTY_TYPES = ['Hotel', 'Motel', 'Inn', 'B&B', 'Boutique', 'Other'];

const COLOR_PRESETS = [
  { name: 'Ocean', value: '#0E7490' },
  { name: 'Forest', value: '#166534' },
  { name: 'Sunset', value: '#C2410C' },
  { name: 'Noir', value: '#18181B' },
  { name: 'Blush', value: '#BE185D' },
  { name: 'Sand', value: '#92400E' },
];

const STEPS = ['Your account', 'Your property', 'Your branding'];

type Form = {
  firstName: string; lastName: string; email: string; password: string;
  propertyName: string; propertyType: string; address: string; city: string;
  state: string; zipCode: string; phone: string; description: string;
  tagline: string; primaryColor: string;
};

const EMPTY: Form = {
  firstName: '', lastName: '', email: '', password: '',
  propertyName: '', propertyType: 'Hotel', address: '', city: '',
  state: '', zipCode: '', phone: '', description: '',
  tagline: '', primaryColor: '#0E7490',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validStep(s: number): boolean {
    if (s === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) { setError('Please enter your full name.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return false; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return false; }
    }
    if (s === 1) {
      for (const [k, label] of [['propertyName', 'Property name'], ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['zipCode', 'ZIP code'], ['phone', 'Phone']] as const) {
        if (!form[k].trim()) { setError(`${label} is required.`); return false; }
      }
    }
    setError('');
    return true;
  }

  async function submit() {
    if (!validStep(2)) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Onboarding failed. Please try again.');
        setSubmitting(false);
        return;
      }
      // Sign in with the new owner account, then land on the owner dashboard.
      const login = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });
      if (login?.error) {
        // Account was created — send them to login to sign in manually.
        router.push('/login?onboarded=1');
      } else {
        router.push('/owner?welcome=1');
      }
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Onboard your hotel</h1>
          <p className="text-slate-600">Join {PRODUCT_NAME} — free to start, live in days.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-cyan-800' : 'text-slate-400'}`}>
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < step ? 'bg-cyan-700 text-white' : i === step ? 'bg-cyan-700 text-white ring-4 ring-cyan-100' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </span>
                <span className="text-sm font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-10 h-0.5 mx-2 ${i < step ? 'bg-cyan-700' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Create the owner account for your property.'}
              {step === 1 && 'Tell us about your property.'}
              {step === 2 && 'Make it yours — this branding shows on your booking site.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First name *</label>
                    <Input value={form.firstName} onChange={set('firstName')} placeholder="Alex" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last name *</label>
                    <Input value={form.lastName} onChange={set('lastName')} placeholder="Morgan" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Work email *</label>
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="alex@yourhotel.com" />
                </div>
                <div>
                  <label className="text-sm font-medium">Password *</label>
                  <Input type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium">Property name *</label>
                    <Input value={form.propertyName} onChange={set('propertyName')} placeholder="Seaside Inn" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium">Type</label>
                    <select value={form.propertyType} onChange={set('propertyType')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                      {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Street address *</label>
                  <Input value={form.address} onChange={set('address')} placeholder="1200 Ocean Ave" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City *</label>
                    <Input value={form.city} onChange={set('city')} placeholder="Asbury Park" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State *</label>
                    <Input value={form.state} onChange={set('state')} placeholder="NJ" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP *</label>
                    <Input value={form.zipCode} onChange={set('zipCode')} placeholder="07712" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input value={form.phone} onChange={set('phone')} placeholder="(732) 555-0140" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    rows={3}
                    placeholder="A few words about your property…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-sm font-medium">Tagline <span className="text-slate-400">(optional)</span></label>
                  <Input value={form.tagline} onChange={set('tagline')} placeholder="Your home by the sea" />
                </div>
                <div>
                  <label className="text-sm font-medium">Brand color</label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.name}
                        onClick={() => setForm((f) => ({ ...f, primaryColor: c.value }))}
                        className={`w-10 h-10 rounded-full border-2 ${form.primaryColor === c.value ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-300' : 'border-slate-200'}`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={set('primaryColor')}
                      className="w-12 h-10 rounded border border-slate-200 cursor-pointer"
                    />
                    <Input value={form.primaryColor} onChange={set('primaryColor')} className="w-32 font-mono" maxLength={7} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: form.primaryColor }}>
                      {(form.propertyName || 'Y').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold">{form.propertyName || 'Your property'}</div>
                      <div className="text-xs text-slate-500">{form.tagline || 'Your tagline here'}</div>
                    </div>
                    <div className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: form.primaryColor }}>
                      Book now
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {step < 2 ? (
                <Button onClick={() => validStep(step) && setStep((s) => s + 1)} className="bg-cyan-700 hover:bg-cyan-800">
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting} className="bg-cyan-700 hover:bg-cyan-800">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  {submitting ? 'Creating…' : 'Launch my property'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account? <Link href="/login" className="text-cyan-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
