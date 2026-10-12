import Link from 'next/link';
import { ArrowRight, Building2, ShieldCheck, Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/guest/SiteFooter';
import { PRODUCT_NAME } from '@/config/product';

const PRINCIPLES = [
  { icon: Building2, title: 'Your brand, your guests', text: 'Guests book with you, not with us. Your name, your colours, your data — exportable any time.' },
  { icon: Sparkles, title: 'Say it, see it', text: 'Software should understand “check in the Smiths” and show you the right screen — not make you hunt for it.' },
  { icon: ShieldCheck, title: 'People stay in charge', text: 'The agent proposes, a person confirms. Every action is permission-checked and written to the activity log.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Navigation variant="marketing" />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-aurora opacity-[0.12] blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">Built for the people who keep the lights on</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Independent hotel owners do everything — front desk, housekeeping, night audit — and still lose 15–25% of every booking to online travel agencies, plus every guest who calls after hours and gets no answer. {PRODUCT_NAME} gives them a booking site under their own name, a front desk they can run by just saying what they need, and a voice that never misses a call.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-3xl border bg-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold">{p.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-3xl border bg-surface-sunken/60 p-8 text-center">
            <p className="text-lg font-semibold">Start where you are</p>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Run everything on {PRODUCT_NAME}, keep your current system and let the agent work it, or start with just the voice agent.</p>
            <Button asChild className="mt-6">
              <Link href="/onboarding">
                Set up your hotel <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
