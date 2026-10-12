import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, PhoneCall, MessageCircle, RefreshCw, Shield, Percent } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/product';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navigation />

      <section className="bg-gradient-to-r from-cyan-800 to-cyan-950 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">About {PRODUCT_NAME}</h1>
            <p className="text-xl md:text-2xl text-cyan-100">
              The platform that puts independent hotels back in charge of their bookings.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Our story</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {PRODUCT_NAME} was built for the independent hotel owners who do everything —
                front desk, housekeeping, night audit — and still lose 15–25% of every booking
                to online travel agencies, plus the guests who call after hours and never get
                an answer. We give those owners a white-labeled booking website, an AI agent
                that answers calls and messages like their best clerk, and one dashboard that
                keeps every channel in sync. Your brand, your data, your revenue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our mission</h3>
                <p className="text-gray-600 leading-relaxed">
                  Help every independent hotel take direct bookings commission-free, answer
                  every guest inquiry instantly, and run their whole operation from one place.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our vision</h3>
                <p className="text-gray-600 leading-relaxed">
                  A world where a 20-room motel has better technology than the biggest chains —
                  and guests never know the difference, because all they see is the hotel&apos;s own brand.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
              <Card className="text-center border-0 shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Percent className="h-8 w-8 text-cyan-700" />
                  </div>
                  <CardTitle>0% commission</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Direct bookings stay commission-free. Keep every dollar you earn.</CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PhoneCall className="h-8 w-8 text-indigo-700" />
                  </div>
                  <CardTitle>Always-on AI staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Voice and WhatsApp agents trained on your rates, policies, and FAQs.</CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg">
                <CardHeader>
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-emerald-700" />
                  </div>
                  <CardTitle>Your data, isolated</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Per-property data isolation, encrypted in transit and at rest. Export anytime.</CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: Building2, title: 'White-label booking site', body: 'Your logo, colors, fonts, and domain. Guests never see our name.' },
                { icon: MessageCircle, title: 'WhatsApp agent', body: 'Meet guests where they already are — instant answers, booking links, confirmations.' },
                { icon: RefreshCw, title: 'Channel sync', body: 'Two-way sync with the big booking platforms. Change a rate once — it changes everywhere.' },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <f.icon className="h-6 w-6 text-slate-700" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{f.title}</h4>
                    <p className="text-sm text-gray-600">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-16">
              <Link
                href="/onboarding"
                className="inline-flex items-center px-8 py-4 rounded-xl bg-cyan-700 text-white font-semibold text-lg hover:bg-cyan-800 transition-colors"
              >
                Onboard your hotel
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
