'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, MicOff, PhoneOff, Mic } from 'lucide-react';
import { speakBlocks } from '@/lib/agent/speak';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AgentController } from '@/components/agent/useAgent';
import { useLiveVoice } from './useLiveVoice';
import { VoiceOrb } from './VoiceOrb';

/**
 * Hands-free mode for the agent workspace. GPT-Live listens and talks;
 * every request it delegates runs through the same agent pipeline as typed
 * commands, so the answer builds itself on screen while it's spoken, and
 * changes still need a "yes" to the plan.
 */
export function useStaffVoice(agent: AgentController, propertyId: string | undefined) {
  const agentRef = React.useRef(agent);
  agentRef.current = agent;

  return useLiveVoice({
    propertyId,
    audience: 'staff',
    onToolCall: async (call) => {
      const args = JSON.parse(call.arguments || '{}') as { request?: string };
      const a = agentRef.current;
      if (call.name === 'front_desk') {
        if (!args.request?.trim()) return { error: 'Say what you need.' };
        // Wait for any in-flight command (voice can be faster than the network).
        for (let i = 0; i < 40 && agentRef.current.busy; i++) await new Promise((r) => setTimeout(r, 150));
        const r = await agentRef.current.send(args.request, { via: 'voice' });
        if (r.error && !r.blocks.length) return { error: r.error };
        return speakBlocks(r.blocks);
      }
      if (call.name === 'confirm_plan') {
        const plan = a.pendingPlan;
        if (!plan) return { error: 'There is no plan waiting for confirmation.' };
        return speakBlocks(await a.confirm(plan.token));
      }
      if (call.name === 'dismiss_plan') {
        const plan = a.pendingPlan;
        if (plan) a.dismiss(plan.token);
        return { dismissed: !!plan };
      }
      return { error: `Unknown tool ${call.name}` };
    },
  });
}

export type StaffVoiceController = ReturnType<typeof useStaffVoice>;

export function VoiceTalkButton({ voice, compact }: { voice: StaffVoiceController; compact?: boolean }) {
  const active = voice.state === 'live' || voice.state === 'connecting';
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      onClick={() => (active ? voice.stop() : void voice.start())}
      className={cn('h-8 gap-1.5 rounded-lg px-2.5 text-xs', !active && 'text-agent hover:bg-agent-soft')}
      aria-label={active ? 'End voice' : 'Talk to the agent'}
    >
      {active ? <PhoneOff className="h-3.5 w-3.5" /> : <AudioLines className="h-3.5 w-3.5" />}
      {!compact && (active ? 'End' : 'Talk')}
    </Button>
  );
}

export function VoiceLiveBar({ voice }: { voice: StaffVoiceController }) {
  const show = voice.state === 'live' || voice.state === 'connecting' || voice.state === 'ending' || !!voice.error;
  const lastAgent = [...voice.captions].reverse().find((c) => c.role === 'agent');
  const lastUser = [...voice.captions].reverse().find((c) => c.role === 'user');
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="mb-2 flex items-center gap-3 rounded-2xl border border-agent/25 bg-card/95 p-3 shadow-lifted backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <VoiceOrb state={voice.state} level={voice.level} speaking={voice.agentSpeaking} working={voice.working} size={40} />
          <div className="min-w-0 flex-1">
            {voice.error ? (
              <p className="text-sm text-destructive">{voice.error}</p>
            ) : voice.state === 'connecting' ? (
              <p className="text-sm text-muted-foreground">Connecting the voice line…</p>
            ) : (
              <>
                <p className="truncate text-sm">{lastAgent?.text || 'Listening — just talk.'}</p>
                {lastUser && <p className="truncate text-xs text-muted-foreground">You: {lastUser.text}</p>}
              </>
            )}
          </div>
          {voice.error ? (
            <Button size="sm" variant="ghost" onClick={voice.clearError}>
              Dismiss
            </Button>
          ) : (
            <div className="flex shrink-0 gap-1">
              <Button size="icon-sm" variant="ghost" onClick={voice.toggleMute} aria-label={voice.muted ? 'Unmute' : 'Mute'}>
                {voice.muted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={voice.stop} aria-label="End voice">
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
