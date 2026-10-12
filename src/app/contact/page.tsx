'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, MessageSquareText, Rocket, Send } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SiteFooter } from '@/components/guest/SiteFooter';
import { PRODUCT_SUPPORT_EMAIL } from '@/config/product';

export default function ContactPage() {
  const [form, setForm] = React.useState({ name: '', hotel: '', email: '', message: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const subject = `StayOS — ${form.hotel || form.name || 'question'}`;
  const body = `${form.message}\n\n— ${form.name}${form.hotel ? `, ${form.hotel}` : ''}\n${form.email}`;
  const href = `mailto:${PRODUCT_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="min-h-dvh bg-background">
      <Navigation variant="marketing" />
      <main className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Talk to us</h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">Questions about switching, keeping your current system, or the voice agent — a person reads every message.</p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Mail, title: 'Email', text: PRODUCT_SUPPORT_EMAIL, href: `mailto:${PRODUCT_SUPPORT_EMAIL}` },
              { icon: Rocket, title: 'Prefer to just try it?', text: 'Set up your hotel in a few minutes', href: '/onboarding' },
              { icon: MessageSquareText, title: 'See it working', text: 'Open the live demo (one-click logins)', href: '/login' },
            ].map((c) => (
              <Link key={c.title} href={c.href} className="flex items-start gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-soft">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <c.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-sm text-muted-foreground">{c.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = href;
          }}
          className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="c-name">
              <Input id="c-name" required value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="Hotel (optional)" htmlFor="c-hotel">
              <Input id="c-hotel" value={form.hotel} onChange={set('hotel')} />
            </Field>
            <Field label="Email" htmlFor="c-email" className="sm:col-span-2">
              <Input id="c-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
            </Field>
            <Field label="How can we help?" htmlFor="c-msg" className="sm:col-span-2">
              <Textarea id="c-msg" rows={6} required value={form.message} onChange={set('message')} placeholder="We run a 30-room motel on Cloudbeds and want to try the voice agent…" />
            </Field>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full">
            <Send className="h-4 w-4" /> Write the email
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Opens your email app with this message ready to send to {PRODUCT_SUPPORT_EMAIL}.</p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
