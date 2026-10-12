'use client';

import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/primitives';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { AgentOrb } from '@/components/agent/Timeline';
import { useConsole } from './ConsoleProvider';

const QUICK = ['brief me', 'who’s arriving today?', 'which rooms need cleaning?', 'forecast the next 3 weekends'];

/**
 * Classic mode's bridge to the agent: ⌘K opens the same agent in a side
 * panel over whatever screen you're on, so you can ask without leaving it.
 */
export function CommandSheet() {
  const { commandOpen, setCommandOpen, setMode, can } = useConsole();
  if (!can('agent.use')) return null;
  return (
    <Sheet open={commandOpen} onOpenChange={setCommandOpen}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[560px]" hideClose>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <AgentOrb />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm">Agent</SheetTitle>
            <SheetDescription className="text-xs">Ask without leaving this screen · <Kbd>esc</Kbd> to close</SheetDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5" onClick={() => setCommandOpen(false)}>
            <Link href="/admin/agent" onClick={() => setMode('AGENTIC', { navigate: false })}>
              <Maximize2 className="h-3.5 w-3.5" /> Full workspace
            </Link>
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <AgentPanel
            compact
            empty={(send) => (
              <div className="py-8 text-center">
                <AgentOrb className="mx-auto h-10 w-10" />
                <p className="mt-4 font-medium">What do you need?</p>
                <p className="mt-1 text-sm text-muted-foreground">I’ll show live data and ask before changing anything.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:border-agent/40 hover:text-foreground">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
