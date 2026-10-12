'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, MicOff, Mic, PhoneOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLiveVoice } from './useLiveVoice';
import { VoiceOrb } from './VoiceOrb';

/**
 * "Talk to us" on a hotel's booking page. The guest speaks with the hotel's
 * voice front desk; answers come from live inventory, and the page follows
 * the conversation — asked-about dates re-price the room list, and choosing
 * a room opens checkout.
 */
export function GuestVoice({
  propertyId,
  propertyName,
  onStay,
  className,
}: {
  propertyId: string;
  propertyName: string;
  onStay?: (stay: { checkIn: string; checkOut: string; guests: number; rooms: number }) => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const voice = useLiveVoice({
    propertyId,
    audience: 'guest',
    onToolCall: async (call, { token }) => {
      const res = await fetch('/api/voice/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: call.name, arguments: call.arguments }),
      });
      const body = (await res.json().catch(() => ({}))) as { output?: Record<string, unknown>; error?: string };
      if (!res.ok) return { error: body.error ?? 'That lookup failed.' };
      const output = body.output ?? {};
      try {
        const args = JSON.parse(call.arguments || '{}');
        if (call.name === 'check_availability' && !output.error) onStay?.({ checkIn: args.check_in, checkOut: args.check_out, guests: args.guests, rooms: args.rooms });
      } catch {
        /* arguments already validated server-side */
      }
      if (call.name === 'start_booking' && typeof output.url === 'string') setTimeout(() => router.push(output.url as string), 600);
      return output;
    },
  });

  const live = voice.state === 'live' || voice.state === 'connecting';
  const begin = () => {
    setOpen(true);
    void voice.start();
  };
  const end = () => {
    voice.stop();
    setTimeout(() => setOpen(false), 400);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={begin}
            className={cn('fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-medium text-brand-foreground shadow-float transition-transform hover:scale-[1.03] lg:bottom-6', className)}
          >
            <AudioLines className="h-4 w-4" /> Talk to us
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed inset-x-3 bottom-24 z-50 rounded-3xl border bg-card p-5 shadow-float sm:inset-x-auto sm:right-4 sm:w-[360px] lg:bottom-6"
            role="dialog"
            aria-label={`Voice front desk for ${propertyName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Front desk · voice</p>
                <p className="font-display text-lg leading-tight">{propertyName}</p>
              </div>
              <button onClick={end} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center text-center">
              <VoiceOrb state={voice.state} level={voice.level} speaking={voice.agentSpeaking} working={voice.working} size={76} tone="brand" />
              <p className="mt-4 min-h-[2.5rem] text-sm" aria-live="polite">
                {voice.error ? (
                  <span className="text-destructive">{voice.error}</span>
                ) : voice.state === 'connecting' ? (
                  <span className="text-muted-foreground">Connecting…</span>
                ) : (
                  [...voice.captions].reverse().find((c) => c.role === 'agent')?.text ?? <span className="text-muted-foreground">Ask about rooms, prices, parking — anything.</span>
                )}
              </p>
              {[...voice.captions].reverse().find((c) => c.role === 'user') && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">You: {[...voice.captions].reverse().find((c) => c.role === 'user')!.text}</p>
              )}
            </div>
            <div className="mt-5 flex justify-center gap-2">
              {live ? (
                <>
                  <Button variant="outline" size="icon" onClick={voice.toggleMute} aria-label={voice.muted ? 'Unmute' : 'Mute'}>
                    {voice.muted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button variant="destructive" onClick={end}>
                    <PhoneOff className="h-4 w-4" /> End
                  </Button>
                </>
              ) : (
                <Button variant="brand" onClick={() => void voice.start()}>
                  <AudioLines className="h-4 w-4" /> {voice.error ? 'Try again' : 'Start talking'}
                </Button>
              )}
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">An AI voice answers from live availability. Bookings finish on this screen — never give card details by voice.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
