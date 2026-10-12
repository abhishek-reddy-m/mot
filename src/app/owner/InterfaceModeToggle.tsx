'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const CAN_SWITCH = ['ADMIN', 'OWNER', 'MANAGER'];

export default function InterfaceModeToggle({
  propertyId,
  propertyName,
  initialMode,
  userRole,
}: {
  propertyId: string;
  propertyName: string;
  initialMode: 'CLASSIC' | 'AGENTIC';
  userRole: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!CAN_SWITCH.includes(userRole)) {
    return (
      <Badge variant={mode === 'AGENTIC' ? 'default' : 'secondary'}>
        {mode === 'AGENTIC' ? 'Agentic (beta)' : 'Classic'}
      </Badge>
    );
  }

  async function toggle() {
    const next = mode === 'AGENTIC' ? 'CLASSIC' : 'AGENTIC';
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/properties/${propertyId}/interface-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interfaceMode: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setMode(data.property.interfaceMode);
        setMsg(`${propertyName} is now in ${next === 'AGENTIC' ? 'Agentic (beta)' : 'Classic'} mode.`);
      } else {
        setMsg(data.message || 'Could not switch mode.');
      }
    } catch {
      setMsg('Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Badge variant={mode === 'AGENTIC' ? 'default' : 'secondary'}>
          {mode === 'AGENTIC' ? 'Agentic (beta)' : 'Classic'}
        </Badge>
        <Button variant="ghost" size="sm" onClick={toggle} disabled={busy} className="flex items-center gap-1.5 text-xs">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'AGENTIC' ? (
            <>
              <ToggleRight className="h-4 w-4 text-cyan-700" /> Back to classic
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4 text-slate-400" /> Switch to AI interface
            </>
          )}
        </Button>
      </div>
      {msg && <p className="text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
