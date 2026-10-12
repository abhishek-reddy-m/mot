import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Laptop,
  LayoutGrid,
  MessageCircle,
  MousePointerClick,
  Percent,
  PhoneCall,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { AgentDemo } from '@/components/marketing/AgentDemo';
import { SiteFooter } from '@/components/guest/SiteFooter';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/config/product';

const PAINS = [
  { title: 'OTAs take 15–25% of every booking.', body: 'You do the work; the platforms take the cut. Your direct website — if you have one — can’t compete with their booking flow.' },
  { title: 'Missed calls are missed revenue.', body: 'A guest calls at 11 PM about a late check-in. Nobody answers. They book the place down the road.' },
  { title: 'Five systems that don’t talk to each other.', body: 'Your reservation system, your website, your phone, your messages — double bookings and rate mistakes live in the gaps.' },
];

const AGENT_POINTS = [
  { icon: MousePointerClick, title: 'Says it, sees it', body: 'Ask in plain words and the answer arrives as the right screen — a list you can act on, a room map, a rate grid — not a wall of text.' },
  { icon: ShieldCheck, title: 'Nothing changes without you', body: 'Every change is a plan you review first. Plans expire, run once, and land in the audit log under your name.' },
  { icon: LayoutGrid, title: 'Classic screens, one click away', body: 'Prefer dashboards? Flip to Classic any time — same data, same actions. Each person picks their default.' },
];

const PATHS = [
  {
    id: 'full',
    icon: Rocket,
    title: 'Run everything on StayOS',
    body: 'Booking site, front desk, housekeeping, rates and the agent in one place. Bring your rooms over in an afternoon.',
    cta: 'Set up my hotel',
    badge: 'Most complete',
  },
  {
    id: 'bridge',
    icon: ServerCog,
    title: 'Keep your current system',
    body: 'Not ready to switch? The agent works your existing PMS for you — through a small app on your front-desk laptop, or in our secure cloud browser with your own logins. Move over whenever you like.',
    cta: 'Connect my system',
    badge: 'No migration',
  },
  {
    id: 'voice',
    icon: PhoneCall,
    title: 'Just the voice agent',
    body: 'A front-desk voice that answers calls and questions 24/7 with your real rates and availability. Nothing else to change.',
    cta: 'Start with voice',
    badge: 'Fastest',
  },
];

const FEATURES = [
  {
    icon: Globe,
    title: 'White-label booking site',
    tagline: 'A booking website that looks and feels like your hotel.',
    points: ['Your name, your colours — guests never see ours.', 'Mobile-first: dates → room → details → booked, in under two minutes.', 'Live availability and exact prices. Free changes until the day before.'],
  },
  {
    icon: PhoneCall,
    title: 'AI voice front desk',
    tagline: 'A clerk who never sleeps and never puts anyone on hold.',
    points: ['Answers 24/7: quotes rates, checks availability, finds reservations.', 'Speaks naturally, handles interruptions, hands off to you when it should.', 'Uses the same live data and permissions as your team.'],
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp agent',
    tagline: 'Meet guests where they already are.',
    points: ['Answers questions about rooms, parking and check-in instantly.', 'Sends booking links and pre-arrival messages.', 'Hands anything unusual to your team.'],
    early: true,
  },
  {
    icon: RefreshCw,
    title: 'OTA & channel sync',
    tagline: 'One calendar for every channel.',
    points: ['Two-way rates and availability with Booking.com, Expedia and Airbnb.', 'No double bookings, no midnight rate entry.', 'OTA bookings land in the same front desk as direct ones.'],
    early: true,
  },
];

const TIERS = [
  { name: 'Voice', price: '$29', unit: '/mo', features: ['AI voice front desk', '100 voice minutes/mo', 'Works with any system', 'Call summaries'], cta: 'Start with voice', href: '/onboarding?path=voice' },
  { name: 'Professional', price: '$149', unit: '/mo', features: ['Everything in Voice, 500 minutes', 'Booking site + agentic console', 'Front desk, housekeeping, rates', 'Keep-your-PMS bridge included', 'Priority onboarding call'], cta: 'Start free', href: '/onboarding', popular: true },
  { name: 'Portfolio', price: 'Custom', unit: '', features: ['Multiple properties', 'Custom voice volume', 'All channels + API', 'Dedicated manager'], cta: 'Talk to us', href: '/contact' },
];

const FAQS = [
  { q: `Will my guests know I'm using ${PRODUCT_NAME}?`, a: 'No. Your booking site and messages carry only your branding. We’re invisible infrastructure.' },
  {
    q: 'Do I have to leave my current reservation system?',
    a: 'No. Connect it instead: install the StayOS connector on a front-desk laptop, or let the agent use your system in our isolated cloud browser with logins you store encrypted. Most hotels migrate later, once they’ve seen it work — and we move your data for you.',
  },
  { q: 'Can the agent do something I didn’t ask for?', a: 'It can only propose. Every change is shown as a plan with exactly what will happen, and runs only when someone with the right role confirms. Everything is in the activity log.' },
  { q: 'How does the voice agent handle complicated requests?', a: 'It answers from your live rates, rooms and policies, and knows when to hand off — anything unusual goes to your front desk with a summary.' },
  { q: 'Is my guest data safe?', a: 'Data is isolated per property and encrypted in transit and at rest. Stored system logins are encrypted with a key only your workspace uses. You can export everything, anytime.' },
  { q: 'What does it cost to get started?', a: 'Nothing upfront — start free and only pay when you go live.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navigation variant="marketing" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-aurora opacity-[0.12] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-agent" /> Built for independent hotels &amp; motels
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl">{PRODUCT_TAGLINE}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A booking site under your own name, a front desk you can run by just saying what you need, and a voice agent that picks up every call — with your real rooms and rates behind every answer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/onboarding">
                  Set up my hotel <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Try the live demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free to start · keep your current system if you like · live in days</p>
          </div>
          <AgentDemo className="lg:ml-4" />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          {[
            { icon: Percent, title: '0% commission', body: 'on direct bookings — keep every dollar.' },
            { icon: Clock, title: '24/7 front desk', body: 'calls and questions answered instantly.' },
            { icon: Rocket, title: 'Days, not months', body: 'from sign-up to live bookings.' },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent */}
      <section id="agent" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-agent">The agentic front desk</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Run the desk in plain language. Watch the screen build itself.</h2>
            <p className="mt-4 text-muted-foreground">“Who’s arriving late?” becomes a list you can act on. “Move the Okafors to an ocean view” becomes a plan you confirm. The agent works on live data — it never guesses a room, a rate or a guest.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {AGENT_POINTS.map((p) => (
              <div key={p.title} className="rounded-3xl border bg-card p-6 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-agent-soft text-agent">
                  <p.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold">{p.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paths */}
      <section className="bg-surface-sunken/60 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start where you are</h2>
            <p className="mt-4 text-muted-foreground">Switch everything, keep what you have, or begin with one piece. Every path upgrades to the next without starting over.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PATHS.map((p) => (
              <Link key={p.id} href={`/onboarding?path=${p.id}`} className="group flex flex-col rounded-3xl border bg-card p-6 shadow-xs transition-all hover:-translate-y-1 hover:shadow-lifted">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{p.badge}</span>
                </div>
                <p className="mt-5 text-lg font-semibold tracking-tight">{p.title}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                {p.id === 'bridge' && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-2">
                      <Laptop className="h-3.5 w-3.5" /> Your laptop
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-2">
                      <ServerCog className="h-3.5 w-3.5" /> Our cloud browser
                    </span>
                  </div>
                )}
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {p.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pains */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight md:text-4xl">Running a hotel is hard enough. Your tech shouldn’t make it harder.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="rounded-3xl border bg-card p-6">
                <p className="font-semibold text-destructive">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-t py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight md:text-4xl">Everything a modern hotel needs. Nothing with someone else’s logo on it.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border bg-card p-7 transition-shadow hover:shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <f.icon className="h-5 w-5" />
                  </span>
                  {f.early && <span className="rounded-full bg-agent-soft px-2.5 py-1 text-[11px] font-medium text-agent">Early access</span>}
                </div>
                <p className="mt-5 text-xl font-semibold tracking-tight">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.tagline}</p>
                <ul className="mt-5 space-y-2.5">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 bg-slate-950 py-20 text-white md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight md:text-4xl">From sign-up to your first direct booking in three steps.</h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              { n: '01', title: 'Tell us about your property', body: 'Name, rooms and prices — or connect your current system and skip the typing.' },
              { n: '02', title: 'Make it yours', body: 'Pick your brand colour, add photos, preview your booking site before anyone else sees it.' },
              { n: '03', title: 'Go live', body: 'Share your booking link, turn on the voice agent and run the desk in plain words.' },
            ].map((s) => (
              <div key={s.n}>
                <p className="font-display text-5xl text-white/25">{s.n}</p>
                <p className="mt-4 text-lg font-semibold">{s.title}</p>
                <p className="mt-2 leading-relaxed text-slate-300">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
              <Link href="/onboarding">
                Start step 1 — it takes a minute <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Simple pricing. Zero commission on direct bookings.</h2>
            <p className="mt-4 text-muted-foreground">Launch pricing. No setup fees. Cancel anytime.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.name} className={`relative flex flex-col rounded-3xl border bg-card p-7 ${t.popular ? 'border-primary shadow-lifted ring-1 ring-primary' : ''}`}>
                {t.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">Most popular</span>}
                <p className="font-semibold">{t.name}</p>
                <p className="mt-3">
                  <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                  <span className="text-muted-foreground">{t.unit}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8" variant={t.popular ? 'default' : 'outline'}>
                  <Link href={t.href}>{t.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Questions, answered.</h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border bg-card transition-shadow open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium">
                  {f.q}
                  <ChevronDown className="ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="bg-aurora animate-aurora absolute inset-0 opacity-95" />
        <div className="relative mx-auto max-w-3xl px-4 text-center text-white sm:px-6">
          <h2 className="font-display text-4xl leading-tight md:text-5xl">Your next guest is searching right now. Be the booking they find.</h2>
          <Button asChild size="lg" className="mt-8 bg-white text-slate-900 hover:bg-white/90">
            <Link href="/onboarding">
              Set up my hotel <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-5 text-sm text-white/80">Free to start · live in days · your brand front and centre</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
