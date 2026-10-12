'use client';

import { useEffect } from 'react';
import { AgentWorkspace } from '@/components/agent/AgentWorkspace';
import { useConsole } from '@/components/console/ConsoleProvider';

export default function AgentPage() {
  const { mode, setMode, can } = useConsole();
  // Opening the workspace directly (link, bookmark) puts you in Agentic mode.
  useEffect(() => {
    if (can('agent.use') && mode !== 'AGENTIC') setMode('AGENTIC', { navigate: false });
  }, [mode, setMode, can]);
  return <AgentWorkspace />;
}
