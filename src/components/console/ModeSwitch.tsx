'use client';

import { LayoutDashboard, Sparkles } from 'lucide-react';
import type { InterfaceMode } from '@/lib/dto';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented';
import { useConsole } from './ConsoleProvider';

/**
 * The Classic ⇄ Agentic switch. Personal and instant: it changes how *you*
 * work right now. Owners/managers set the property default in Settings.
 */
export function ModeSwitch({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { mode, setMode, can } = useConsole();
  if (!can('agent.use')) return null;
  const agentic = mode === 'AGENTIC';
  const options: SegmentedOption<InterfaceMode>[] = [
    { value: 'CLASSIC', label: 'Classic', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    {
      value: 'AGENTIC',
      label: <span className={agentic ? 'text-white' : undefined}>Agentic</span>,
      icon: <Sparkles className={agentic ? 'h-3.5 w-3.5 text-white' : 'h-3.5 w-3.5'} />,
      activeClassName: 'bg-aurora animate-aurora shadow-glow',
    },
  ];
  return <SegmentedControl aria-label="Interface mode" layoutId={`console-mode-${size}`} size={size} value={mode} onChange={(m) => setMode(m)} options={options} />;
}
