import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/config/product';
import {
  PhoneCall,
  MessageCircle,
  Globe,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  PlayCircle,
  Percent,
  Clock,
  Rocket,
  ChevronDown,
} from 'lucide-react';

const PAINS = [
  {
    title: 'OTAs take 15–25% of every booking.',
    body: 'You do the work; the platforms take the cut. Your direct website — if you have one — can\u2019t compete with their booking flow.',
  },
  {
    title: 'Missed calls are missed revenue.',
    body: 'A guest calls at 11 PM about a late check-in. Nobody answers. They book the place down the road.',
  },
  {
    title: 'Five systems that don\u2019t talk to each other.',
    body: 'Your reservation system, your website, your phone, your messages — double bookings and rate mistakes live in the gaps.',
  },
];

const FEATURES = [
  {
    icon: Globe,
    title: 'White-label booking site',
    tagline: 'A booking website that looks, sounds, and feels like your hotel.',
    points: [
      'Your logo, your colors, your fonts, your domain.',
      'Mobile-first booking flow: search → room → guest details → pay. Under 2 minutes.',
      'Real-time availability and rates — no \u201ccall to confirm.\u201d',
    ],
    proof: 'Guests never see our name. It\u2019s your brand from the first click to the confirmation email.',
  },
  {
    icon: PhoneCall,
    title: 'AI voice agent',
    tagline: 'A front-desk clerk who never sleeps, never puts anyone on hold.',
    points: [
      'Answers calls 24/7: quotes rates, checks availability, takes reservations.',
      'Speaks naturally, handles interruptions, transfers to you when it should.',
      'Every call logged with a summary in your dashboard.',
    ],
    proof: 'Built on real-time voice AI with your rates, policies, and FAQs loaded in.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp agent',
    tagline: 'Meet guests where they already are.',
    points: [
      'Guests ask about rooms, parking, check-in time — the agent answers instantly.',
      'Sends booking links, confirmations, and pre-arrival messages automatically.',
      'Hands off to your team for anything unusual.',
    ],
    proof: 'No app to install. It works inside the WhatsApp your guests already use.',
  },
  {
    icon: RefreshCw,
    title: 'OTA & channel sync',
    tagline: 'One calendar to rule them all.',
    points: [
      'Two-way sync with Booking.com, Expedia, and Airbnb: rates and availability update everywhere, instantly.',
      'No more double bookings, no more manual rate entry at midnight.',
      'Direct bookings stay commission-free; OTA bookings flow into the same dashboard.',
    ],
    proof: 'Change a rate once — it changes everywhere.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Tell us about your property',
    body: 'Rooms, rates, photos, policies. Import from your current system or start fresh — most owners finish in under an hour.',
  },
  {
    n: '2',
    title: 'Make it yours',
    body: 'Add your property name, tagline, and brand colors. Preview your booking site live before anyone else sees it.',
  },
  {
    n: '3',
    title: 'Go live and get booked',
    body: 'Open your dashboard, turn on the AI agents, sync your booking channels. Your first commission-free booking can arrive tonight.',
  },
];

const TIERS = [
  {
    name: 'Starter',
    price: '$49',
    unit: '/mo',
    features: ['1 property, up to 25 rooms', '100 AI voice minutes/mo', 'WhatsApp agent', '1 OTA channel sync', 'Email support'],
    cta: 'Start free',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$149',
    unit: '/mo',
    features: ['1 property, unlimited rooms', '500 AI voice minutes/mo', 'WhatsApp agent', 'All OTA channels', 'Priority support + onboarding call'],
    cta: 'Start free',
    popular: true,
  },
  {
    name: 'Portfolio',
    price: 'Custom',
    unit: '',
    features: ['Multiple properties', 'Custom AI voice volume', 'WhatsApp agent', 'All channels + API', 'Dedicated manager'],
    cta: 'Talk to us',
    popular: false,
  },
];

const FAQS = [
  {
    q: `Will my guests know I'm using ${PRODUCT_NAME}?`,
    a: 'No. Your booking site, emails, and messages carry only your branding. We\u2019re invisible infrastructure.',
  },
  {
    q: 'I already use Booking.com/Expedia. Do I have to leave them?',
    a: `${PRODUCT_NAME} syncs with your booking channels two ways — you keep that demand and add commission-free direct bookings on top.`,
  },
  {
    q: 'What happens to my current reservation system?',
    a: 'Two paths: connect to your existing system, or migrate fully to ours. We\u2019ll help with either during onboarding.',
  },
  {
    q: 'How does the AI voice agent handle complicated requests?',
    a: 'It\u2019s trained on your rates, policies, and FAQs, and it knows when to hand off — anything unusual goes straight to you or your front desk, with a full transcript.',
  },
  {
    q: 'Is my guest data safe?',
    a: 'Your data is isolated per property, encrypted in transit and at rest, and never sold or shared. You can export everything, anytime.',
  },
  {
    q: 'What does it cost to get started?',
    a: 'Nothing upfront — start free and only pay when you go live. Final launch pricing is confirmed during onboarding.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navigation />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-cyan-700 uppercase mb-6">
              Built for independent hotels &amp; motels
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              {PRODUCT_TAGLINE}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              {PRODUCT_NAME} gives your property a beautiful booking site under your own name,
              an AI agent that answers calls and chats like your best front-desk clerk, and one
              dashboard that keeps your booking channels in perfect sync.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-700 text-white font-semibold text-lg hover:bg-cyan-800 transition-colors shadow-lg"
              >
                Launch my booking site
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <Link
                href="/properties"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold text-lg hover:border-cyan-700 hover:text-cyan-800 transition-colors"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                See a live demo
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              No credit card to start · Your branding, your domain · Live in days, not months
            </p>
          </div>

          {/* Product visual: stylized booking-site mockup */}
          <div className="max-w-3xl mx-auto mt-16 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-slate-500 bg-white rounded-md px-3 py-1 border border-slate-200">
                book.yourhotel.com
              </span>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-700 flex items-center justify-center text-white font-bold">Y</div>
                  <div>
                    <div className="font-bold">Your Hotel Name</div>
                    <div className="text-xs text-slate-500">Your tagline here</div>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-lg bg-cyan-700 text-white text-sm font-semibold">Book now</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {['Deluxe King', 'Double Queen', 'Family Suite'].map((room, i) => (
                  <div key={room} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className={`h-20 bg-gradient-to-br ${i === 0 ? 'from-cyan-600 to-cyan-800' : i === 1 ? 'from-amber-500 to-orange-700' : 'from-slate-500 to-slate-700'}`} />
                    <div className="p-3">
                      <div className="text-sm font-semibold">{room}</div>
                      <div className="text-xs text-slate-500">from ${129 + i * 60}/night</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-slate-100 bg-white">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                <Percent className="h-6 w-6 text-cyan-700" />
              </div>
              <div>
                <div className="font-bold text-lg">0% commission</div>
                <p className="text-slate-600 text-sm">on direct bookings — keep every dollar you earn.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-cyan-700" />
              </div>
              <div>
                <div className="font-bold text-lg">24/7 AI front desk</div>
                <p className="text-slate-600 text-sm">calls, WhatsApp, and chat answered instantly.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                <Rocket className="h-6 w-6 text-cyan-700" />
              </div>
              <div>
                <div className="font-bold text-lg">Days, not months</div>
                <p className="text-slate-600 text-sm">from sign-up to taking live bookings.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Running a hotel is hard enough. Your tech shouldn&apos;t make it harder.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {PAINS.map((pain) => (
              <div key={pain.title} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-3 text-red-700">{pain.title}</h3>
                <p className="text-slate-600 leading-relaxed">{pain.body}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-semibold text-slate-800 max-w-2xl mx-auto">
            {PRODUCT_NAME} replaces all of it with one platform that carries{' '}
            <span className="text-cyan-700">your name</span> — not ours.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Everything a modern hotel needs. Nothing with someone else&apos;s logo on it.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-8 hover:shadow-xl transition-shadow bg-white">
                <div className="w-14 h-14 rounded-2xl bg-cyan-700 flex items-center justify-center mb-6">
                  <f.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{f.title}</h3>
                <p className="text-slate-600 font-medium mb-5">{f.tagline}</p>
                <ul className="space-y-2.5 mb-6">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-slate-700">
                      <CheckCircle className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-slate-500 italic border-l-2 border-cyan-200 pl-4">{f.proof}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 md:py-28 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              From sign-up to your first direct booking in three steps.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-6xl font-extrabold text-cyan-500/30 mb-4">{s.n}</div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-slate-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link
              href="/onboarding"
              className="inline-flex items-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-semibold text-lg hover:bg-cyan-500 transition-colors"
            >
              Start step 1 — it takes a minute
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-28 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Simple pricing. Zero commission on direct bookings.</h2>
            <p className="text-slate-600">Every plan includes your white-labeled booking site and unlimited direct bookings at 0% commission.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl p-8 bg-white border-2 ${t.popular ? 'border-cyan-700 shadow-xl relative' : 'border-slate-200'}`}
              >
                {t.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-700 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{t.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{t.price}</span>
                  <span className="text-slate-500">{t.unit}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={`block text-center px-6 py-3 rounded-xl font-semibold transition-colors ${
                    t.popular
                      ? 'bg-cyan-700 text-white hover:bg-cyan-800'
                      : 'border-2 border-slate-200 text-slate-800 hover:border-cyan-700'
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-8">
            Launch pricing. No setup fees. Cancel anytime. Your data stays yours.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center">Questions, answered.</h2>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-xl border border-slate-200 bg-white open:shadow-md transition-shadow">
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-semibold list-none">
                    {f.q}
                    <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4" />
                  </summary>
                  <p className="px-6 pb-6 text-slate-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-r from-cyan-800 to-cyan-950 text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            Your next guest is searching right now. Be the booking they find.
          </h2>
          <Link
            href="/onboarding"
            className="inline-flex items-center px-10 py-5 rounded-xl bg-white text-cyan-900 font-bold text-lg hover:bg-cyan-50 transition-colors shadow-xl"
          >
            Launch my booking site
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
          <p className="mt-6 text-cyan-200 text-sm">Free to start · Live in days · Your brand front and center</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-14">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><Link href="/properties" className="hover:text-white">Live demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Get started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/onboarding" className="hover:text-white">Onboard your hotel</Link></li>
                <li><Link href="/register" className="hover:text-white">Create account</Link></li>
                <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Demo</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/properties" className="hover:text-white">Browse demo properties</Link></li>
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            © 2026 {PRODUCT_NAME}. Built for the people who keep the lights on.
          </div>
        </div>
      </footer>
    </div>
  );
}
