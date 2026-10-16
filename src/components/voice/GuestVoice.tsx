'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Mic, MicOff, PhoneOff, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLiveVoice } from './useLiveVoice';
import { VoiceOrb, VoiceStatus, voicePhase } from './VoiceOrb';

/** Past this scroll depth the floating button folds into a round icon so it covers less of the page. */
const COLLAPSE_AFTER = 120;

/**
 * "Talk to us" on a hotel's booking page. The guest speaks with the hotel's
 * voice front desk; answers come from live inventory, and the page follows
 * the conversation — asked-about dates re-price the room list, and choosing
 * a room opens checkout.
 *
 * variant="fab" (default): a floating pill, bottom-right above the phone
 * booking bar (safe-area aware), that folds into a 48px round button once
 * the guest scrolls. variant="inline": a static full-width outline button
 * for a sidebar card. Either way the call opens in a small panel; Esc or
 * Close ends it and focus returns to the button.
 */
export function GuestVoice({
  propertyId,
  propertyName,
  onStay,
  className,
  variant = 'fab',
}: {
  propertyId: string;
  propertyName: string;
  onStay?: (stay: { checkIn: string; checkOut: string; guests: number; rooms: number }) => void;
  /** Merged last onto the trigger button, so callers can reposition or restyle it. */
  className?: string;
  variant?: 'fab' | 'inline';
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const wasOpen = React.useRef(false);
  const uid = React.useId();
  const panelId = `${uid}-voice`;
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;

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

  // Older callers made the floating button inline by passing a "static …" className; treat that as the inline variant.
  const kind = variant === 'inline' || /(^|\s)static(\s|$)/.test(className ?? '') ? 'inline' : 'fab';
  const live = voice.state === 'live' || voice.state === 'connecting';
  const phase = voicePhase({ state: voice.state, speaking: voice.agentSpeaking, working: voice.working, muted: voice.muted, error: voice.error });
  const lastAgent = [...voice.captions].reverse().find((c) => c.role === 'agent');
  const lastUser = [...voice.captions].reverse().find((c) => c.role === 'user');

  const begin = () => {
    if (open) {
      panelRef.current?.focus();
      return;
    }
    setOpen(true);
    void voice.start();
  };
  const end = () => {
    voice.stop();
    setTimeout(() => setOpen(false), 400);
  };

  // Fold the floating pill into an icon once the guest scrolls past the top of the page.
  React.useEffect(() => {
    if (kind !== 'fab') return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCollapsed(window.scrollY > COLLAPSE_AFTER));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
    };
  }, [kind]);

  // Move focus into the panel when it opens, and back to the button when it closes.
  React.useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const frame = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const trigger =
    kind === 'inline' ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={begin}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          'relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-strong/50 bg-surface px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-border-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className
        )}
      >
        <AudioLines className="size-4 shrink-0 text-brand" aria-hidden />
        Talk to us
      </button>
    ) : (
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={triggerRef}
            key="fab"
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={begin}
            aria-haspopup="dialog"
            title={collapsed ? 'Talk to us' : undefined}
            className={cn(
              // Bottom-right, clear of the phone booking bar and the home indicator; from lg there is no bar.
              'fixed bottom-[calc(env(safe-area-inset-bottom)_+_5rem)] right-[max(1rem,env(safe-area-inset-right))] z-40 lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:right-6',
              'inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-brand text-sm font-medium text-brand-foreground shadow-float transition-[width,padding,filter] duration-200 hover:brightness-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              collapsed ? 'w-12 px-0' : 'pl-4 pr-5',
              className
            )}
          >
            <AudioLines className="size-5 shrink-0" aria-hidden />
            <span className={cn(collapsed && 'sr-only')}>Talk to us</span>
          </motion.button>
        )}
      </AnimatePresence>
    );

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id={panelId}
            key="panel"
            role="dialog"
            aria-labelledby={titleId}
            aria-describedby={noteId}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                end();
              }
            }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)_+_5rem)] z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-3xl border bg-card p-5 text-card-foreground shadow-float focus:outline-none',
              'sm:inset-x-auto sm:right-4 sm:w-[360px] lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:right-6'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Front desk · voice
                  <Badge variant="agent" size="sm" icon={Sparkles}>
                    AI
                  </Badge>
                </p>
                <h2 id={titleId} className="mt-1 truncate font-display text-lg leading-tight">
                  {propertyName}
                </h2>
              </div>
              <IconButton label="Close voice chat" variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0 text-muted-foreground" onClick={end}>
                <X aria-hidden />
              </IconButton>
            </div>

            <div className="mt-5 flex flex-col items-center text-center">
              <VoiceOrb state={voice.state} level={voice.level} speaking={voice.agentSpeaking} working={voice.working} muted={voice.muted} size={76} tone="brand" />
              <VoiceStatus phase={phase} tone="brand" className="mt-4" />
              <div className="mt-3 min-h-[2.75rem] w-full text-sm leading-relaxed" aria-live="polite">
                {voice.error ? (
                  <>
                    <p className="font-medium text-destructive">We couldn’t connect the call.</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{voice.error}</p>
                  </>
                ) : voice.state === 'connecting' ? (
                  <p className="text-muted-foreground">
                    <span className="sr-only">Connecting you to the front desk. </span>If your browser asks, allow the microphone.
                  </p>
                ) : lastAgent ? (
                  <p>{lastAgent.text}</p>
                ) : (
                  <p className="text-muted-foreground">Ask about rooms, prices, parking — anything.</p>
                )}
              </div>
              {lastUser && !voice.error && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  <span className="font-medium">You:</span> {lastUser.text}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-center gap-2">
              {live ? (
                <>
                  <IconButton
                    label={voice.muted ? 'Turn microphone on' : 'Turn microphone off'}
                    aria-pressed={voice.muted}
                    variant="outline"
                    size="icon-lg"
                    onClick={voice.toggleMute}
                    className={cn(voice.muted && 'border-destructive/40 text-destructive')}
                  >
                    {voice.muted ? <MicOff aria-hidden /> : <Mic aria-hidden />}
                  </IconButton>
                  <Button variant="destructive" className="h-11 rounded-xl px-5" onClick={end}>
                    <PhoneOff aria-hidden /> End call
                  </Button>
                </>
              ) : (
                <Button variant="brand" className="h-11 rounded-xl px-5" onClick={() => void voice.start()} disabled={voice.state === 'ending'}>
                  <AudioLines aria-hidden /> {voice.error ? 'Try again' : 'Start talking'}
                </Button>
              )}
            </div>
            <p id={noteId} className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              An AI voice answers from live availability. Bookings finish on this screen — never give card details by voice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
