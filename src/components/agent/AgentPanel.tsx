'use client';

import * as React from 'react';
import { WifiOff } from 'lucide-react';
import { useConsole } from '@/components/console/ConsoleProvider';
import { AgentUIProvider } from './AgentUI';
import { Composer, type ComposerHandle } from './Composer';
import { Timeline, useStickToBottom } from './Timeline';
import { useAgent, type AgentController } from './useAgent';

/**
 * Conversation + composer, shared by the full Agentic workspace and the ⌘K
 * side sheet in Classic mode. `empty` renders when there are no turns yet.
 */
export function AgentPanel({
  compact = false,
  empty,
  rail,
  controllerRef,
}: {
  compact?: boolean;
  empty?: (send: (cmd: string) => void) => React.ReactNode;
  rail?: (agent: AgentController) => React.ReactNode;
  controllerRef?: React.MutableRefObject<AgentController | null>;
}) {
  const { propertyId, ctx, refresh, property, pendingCommand, takePendingCommand } = useConsole();
  const agent = useAgent(propertyId, { onChange: refresh });

  // A command handed over from elsewhere in the console ("Fix" on an alert).
  React.useEffect(() => {
    if (!pendingCommand || !propertyId || agent.busy) return;
    const cmd = takePendingCommand();
    if (cmd) void agent.send(cmd);
  }, [pendingCommand, propertyId, agent, takePendingCommand]);
  const composer = React.useRef<ComposerHandle>(null);
  const lastBlockCount = agent.turns.reduce((n, t) => n + t.blocks.length, 0) + agent.turns.length;
  const scrollRef = useStickToBottom<HTMLDivElement>(lastBlockCount + (agent.busy ? 1 : 0));
  if (controllerRef) controllerRef.current = agent;

  const latestPlan = React.useMemo(() => {
    for (let i = agent.turns.length - 1; i >= 0; i--) {
      const plan = agent.turns[i].blocks.find((b) => b.type === 'plan');
      if (plan && plan.type === 'plan') {
        const state = agent.plans[plan.plan.token];
        return !state || state === 'idle' ? plan.plan.token : undefined;
      }
    }
    return undefined;
  }, [agent.turns, agent.plans]);

  const ui = {
    send: agent.send,
    prefill: (cmd: string) => composer.current?.setValue(cmd),
    confirm: agent.confirm,
    dismiss: agent.dismiss,
    plans: agent.plans,
    today: ctx?.today ?? new Date().toISOString().slice(0, 10),
    busy: agent.busy,
    compact,
    latestPlan,
  };

  return (
    <AgentUIProvider value={ui}>
      <div className="flex h-full min-h-0">
        <div className="flex min-w-0 flex-1 flex-col">
          {!agent.online && (
            <div className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-xs font-medium text-warning">
              <WifiOff className="h-3.5 w-3.5" /> You’re offline. The classic screens still show the last data loaded; commands will work again when you reconnect.
            </div>
          )}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <div className={compact ? 'px-4 py-5' : 'mx-auto w-full max-w-3xl px-4 py-8 sm:px-6'}>
              {agent.turns.length === 0 ? empty?.(agent.send) : <Timeline turns={agent.turns} onRetry={agent.send} compact={compact} />}
            </div>
          </div>
          <div className={compact ? 'border-t bg-background/80 p-3' : 'bg-gradient-to-t from-background via-background to-background/0 pb-5 pt-2'}>
            <div className={compact ? '' : 'mx-auto w-full max-w-3xl px-4 sm:px-6'}>
              <Composer
                ref={composer}
                onSend={agent.send}
                onStop={agent.stop}
                busy={agent.busy}
                online={agent.online}
                history={agent.history}
                compact={compact}
                autoFocus
                placeholder={property ? `Ask about ${property.name}, or tell me what to do…` : undefined}
              />
              {agent.turns.length > 0 && !compact && (
                <div className="mt-2 flex justify-end">
                  <button onClick={agent.reset} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Clear conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {rail?.(agent)}
      </div>
    </AgentUIProvider>
  );
}
