'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Send, Loader2, Sparkles, LayoutDashboard, ToggleLeft, ToggleRight } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/product';

type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
  interfaceMode: 'CLASSIC' | 'AGENTIC';
};

type ChatLink = { label: string; href: string };
type Message = { role: 'user' | 'agent'; text: string; links?: ChatLink[] };

const SUGGESTIONS = [
  "today's arrivals",
  'departures tomorrow',
  'availability next weekend',
  'occupancy this week',
  'property info',
];

const CAN_SWITCH = ['ADMIN', 'OWNER', 'MANAGER'];

export default function AgentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [switching, setSwitching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canSwitch = !!role && CAN_SWITCH.includes(role);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/agent');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/owner/properties')
      .then((r) => (r.ok ? r.json() : { properties: [] }))
      .then((d) => {
        const list: Property[] = d.properties ?? [];
        setProperties(list);
        if (list.length > 0 && !propertyId) {
          setPropertyId(list[0].id);
          setMessages([
            {
              role: 'agent',
              text: `Hi! I'm the ${PRODUCT_NAME} command interface (beta) for ${list[0].name}. Ask me about arrivals, departures, availability, reservations, or occupancy — or type "help".`,
            },
          ]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const active = properties.find((p) => p.id === propertyId);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || sending || !propertyId) return;
    setMessages((m) => [...m, { role: 'user', text: clean }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, message: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: 'agent', text: data.message || 'Something went wrong.' }]);
      } else {
        setMessages((m) => [...m, { role: 'agent', text: data.text, links: data.links }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: 'Network error — please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  async function toggleMode() {
    if (!active || switching || !canSwitch) return;
    const next = active.interfaceMode === 'AGENTIC' ? 'CLASSIC' : 'AGENTIC';
    setSwitching(true);
    try {
      const res = await fetch(`/api/properties/${active.id}/interface-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interfaceMode: next }),
      });
      if (res.ok) {
        const data = await res.json();
        setProperties((ps) => ps.map((p) => (p.id === active.id ? { ...p, interfaceMode: data.property.interfaceMode } : p)));
        setMessages((m) => [
          ...m,
          { role: 'agent', text: `${active.name} is now in ${next === 'AGENTIC' ? 'Agentic (beta)' : 'Classic'} mode. This switch was logged.` },
        ]);
      }
    } finally {
      setSwitching(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2">
                AI Command
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                  <Sparkles className="h-3 w-3 mr-1" /> Beta
                </Badge>
              </h1>
              <p className="text-sm text-slate-500">Natural-language front desk — answers from live data</p>
            </div>
          </div>
          <Link href="/front-desk">
            <Button variant="outline" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Classic front desk
            </Button>
          </Link>
        </div>

        {/* Property selector + mode switch */}
        <Card className="mb-6">
          <CardContent className="pt-6 flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Property</label>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setMessages([]);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium bg-white"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.city}, {p.state}
                  </option>
                ))}
              </select>
              {active && (
                <Badge variant={active.interfaceMode === 'AGENTIC' ? 'default' : 'secondary'}>
                  {active.interfaceMode === 'AGENTIC' ? 'Agentic mode' : 'Classic mode'}
                </Badge>
              )}
            </div>
            {canSwitch && active && (
              <Button variant="ghost" onClick={toggleMode} disabled={switching} className="flex items-center gap-2 text-sm">
                {active.interfaceMode === 'AGENTIC' ? (
                  <>
                    <ToggleRight className="h-5 w-5 text-cyan-700" /> Back to classic
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-5 w-5 text-slate-400" /> Switch to AI interface
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {active ? `Ask about ${active.name}` : 'Select a property to begin'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] overflow-y-auto rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-4 mb-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center pt-16">
                  {properties.length === 0 ? 'No properties assigned to your account yet.' : 'Ask something like "today\u2019s arrivals".'}
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === 'user' ? 'bg-cyan-700 text-white' : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    {m.links && m.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.links.map((l) => (
                          <Link key={l.href + l.label} href={l.href}>
                            <Button size="sm" variant="outline" className="text-xs bg-white">
                              {l.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-700" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending || !propertyId}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-cyan-700 hover:text-cyan-800 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try "show rooms needing attention" — or type "help"'
                disabled={sending || !propertyId}
                className="flex-1"
                maxLength={500}
              />
              <Button type="submit" disabled={sending || !input.trim() || !propertyId} className="bg-cyan-700 hover:bg-cyan-800">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-slate-400 mt-3">
              Beta: deterministic command parser over live property data — no AI model connected yet. Every command is logged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
