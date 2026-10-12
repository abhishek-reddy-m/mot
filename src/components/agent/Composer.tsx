'use client';

import * as React from 'react';
import { ArrowUp, CornerDownLeft, Mic, Square, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/primitives';

export const COMMAND_EXAMPLES = [
  'brief me',
  'who’s arriving today?',
  'who’s leaving today?',
  'who is in house?',
  'check in the Smiths, quiet room on a high floor',
  'check out room 201',
  'assign rooms for today’s arrivals',
  'which rooms need cleaning?',
  'auto-assign housekeeping',
  'show the housekeeping board',
  'mark 203 clean',
  'room 106 out of order — broken AC',
  'availability next weekend for 2 guests',
  'forecast the next 3 weekends',
  'occupancy this week',
  'raise weekend rates 10%',
  'what happened today?',
  'help',
];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeech(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface ComposerHandle {
  focus: () => void;
  setValue: (v: string) => void;
}

export const Composer = React.forwardRef<
  ComposerHandle,
  {
    onSend: (text: string) => void;
    onStop: () => void;
    busy: boolean;
    online: boolean;
    history: string[];
    placeholder?: string;
    compact?: boolean;
    autoFocus?: boolean;
  }
>(function Composer({ onSend, onStop, busy, online, history, placeholder, compact, autoFocus }, ref) {
  const [value, setValue] = React.useState('');
  const [historyIndex, setHistoryIndex] = React.useState<number | null>(null);
  const [highlight, setHighlight] = React.useState(0);
  const [listening, setListening] = React.useState(false);
  const [speechOk, setSpeechOk] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const recRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => setSpeechOk(!!getSpeech()), []);

  React.useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    setValue: (v: string) => {
      setValue(v);
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(v.length, v.length);
      });
    },
  }));

  // Auto-grow up to ~6 lines.
  React.useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const q = value.trim().toLowerCase();
  const matches = q.length >= 2 ? COMMAND_EXAMPLES.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q).slice(0, 5) : [];

  function submit(text = value) {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setValue('');
    setHistoryIndex(null);
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (matches.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && historyIndex === null) {
      e.preventDefault();
      setHighlight((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
      return;
    }
    if (matches.length && e.key === 'Tab') {
      e.preventDefault();
      setValue(matches[highlight]);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'ArrowUp' && !value && history.length) {
      e.preventDefault();
      const idx = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setValue(history[idx]);
      return;
    }
    if (e.key === 'ArrowDown' && historyIndex !== null) {
      e.preventDefault();
      const idx = historyIndex + 1;
      if (idx >= history.length) {
        setHistoryIndex(null);
        setValue('');
      } else {
        setHistoryIndex(idx);
        setValue(history[idx]);
      }
      return;
    }
    if (e.key === 'Escape') taRef.current?.blur();
  }

  function toggleMic() {
    const Speech = getSpeech();
    if (!Speech) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Speech();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    const base = value ? value.trimEnd() + ' ' : '';
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setValue(base + text);
    };
    rec.onend = () => {
      setListening(false);
      taRef.current?.focus();
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="relative">
      {matches.length > 0 && (
        <div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border bg-popover p-1 shadow-lifted animate-scale-in">
          {matches.map((m, i) => (
            <button
              key={m}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(m);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', i === highlight ? 'bg-accent' : '')}
            >
              <span>{m}</span>
              {i === highlight && <Kbd>Tab</Kbd>}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          'group relative rounded-2xl border bg-card shadow-lifted transition-shadow focus-within:shadow-glow',
          !online && 'border-warning/50'
        )}
      >
        <textarea
          id="agent-composer"
          ref={taRef}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value);
            setHistoryIndex(null);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={listening ? 'Listening…' : placeholder ?? 'Ask or tell the agent what to do…'}
          aria-label="Message the agent"
          className={cn(
            'block w-full resize-none bg-transparent px-4 pb-12 pt-3.5 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none',
            compact && 'text-sm'
          )}
        />
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1">
          {speechOk && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggleMic}
              aria-label={listening ? 'Stop listening' : 'Speak a command'}
              className={cn(listening && 'animate-pulse-ring rounded-full bg-agent-soft text-agent')}
            >
              <Mic />
            </Button>
          )}
          <div className="ml-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            {!online ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            ) : (
              !compact && (
                <>
                  <CornerDownLeft className="h-3 w-3" /> send · <Kbd>⇧</Kbd>
                  <CornerDownLeft className="h-3 w-3" /> new line · <Kbd>↑</Kbd> history
                </>
              )
            )}
          </div>
          <div className="ml-auto">
            {busy ? (
              <Button type="button" size="icon-sm" variant="secondary" onClick={onStop} aria-label="Stop">
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button type="button" size="icon-sm" variant="agent" onClick={() => submit()} disabled={!value.trim()} aria-label="Send" className="rounded-lg">
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
