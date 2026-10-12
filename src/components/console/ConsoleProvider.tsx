'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import type { InterfaceMode, StaffContext, StaffProperty } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { homeForRole } from '@/lib/routes';

interface ConsoleState {
  ctx: StaffContext | undefined;
  loading: boolean;
  error: Error | undefined;
  property: StaffProperty | undefined;
  propertyId: string | undefined;
  setPropertyId: (id: string) => void;
  /** Effective mode: the person's choice, else the property's default. */
  mode: InterfaceMode;
  setMode: (mode: InterfaceMode, opts?: { navigate?: boolean }) => void;
  can: (perm: string) => boolean;
  role: string | undefined;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  /** Revalidate every staff API view (after the agent changes something). */
  refresh: () => void;
  homeHref: string;
}

const Ctx = React.createContext<ConsoleState | null>(null);

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode) — preference just won't persist */
  }
};

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const { data: ctx, error, isLoading } = useSWR<StaffContext>('/api/admin/context', fetcher, {
    revalidateOnFocus: false,
  });

  const userId = ctx?.user.id;
  const [propertyId, setPropertyIdState] = React.useState<string>();
  const [modeOverride, setModeOverride] = React.useState<InterfaceMode | null>(null);
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Pick the remembered property (or the first one) once we know the user.
  React.useEffect(() => {
    if (!ctx || propertyId) return;
    const remembered = read(`stayos:property:${ctx.user.id}`);
    const valid = ctx.properties.find((p) => p.id === remembered) ?? ctx.properties[0];
    if (valid) setPropertyIdState(valid.id);
  }, [ctx, propertyId]);

  // Load the person's mode preference for this property.
  React.useEffect(() => {
    if (!userId || !propertyId) return;
    const saved = read(`stayos:mode:${userId}:${propertyId}`);
    setModeOverride(saved === 'AGENTIC' || saved === 'CLASSIC' ? saved : null);
  }, [userId, propertyId]);

  const property = ctx?.properties.find((p) => p.id === propertyId);
  const canUseAgent = !!ctx?.permissions.includes('agent.use');
  const mode: InterfaceMode = canUseAgent ? (modeOverride ?? property?.interfaceMode ?? 'CLASSIC') : 'CLASSIC';
  const homeHref = homeForRole(ctx?.user.role);

  const setPropertyId = React.useCallback(
    (id: string) => {
      setPropertyIdState(id);
      if (userId) write(`stayos:property:${userId}`, id);
    },
    [userId]
  );

  const setMode = React.useCallback(
    (next: InterfaceMode, opts: { navigate?: boolean } = { navigate: true }) => {
      setModeOverride(next);
      if (userId && propertyId) write(`stayos:mode:${userId}:${propertyId}`, next);
      if (opts.navigate === false) return;
      if (next === 'AGENTIC' && !pathname.startsWith('/admin/agent')) router.push('/admin/agent');
      if (next === 'CLASSIC' && pathname.startsWith('/admin/agent')) router.push(homeHref);
    },
    [userId, propertyId, pathname, router, homeHref]
  );

  const can = React.useCallback((perm: string) => !!ctx?.permissions.includes(perm), [ctx]);

  const refresh = React.useCallback(() => {
    void mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/') && key !== '/api/admin/context');
  }, [mutate]);

  // Global shortcut: ⌘K / Ctrl+K opens the agent from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (pathname.startsWith('/admin/agent')) {
          document.getElementById('agent-composer')?.focus();
        } else if (canUseAgent) {
          setCommandOpen((o) => !o);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, canUseAgent]);

  const value: ConsoleState = {
    ctx,
    loading: isLoading,
    error: error as Error | undefined,
    property,
    propertyId,
    setPropertyId,
    mode,
    setMode,
    can,
    role: ctx?.user.role,
    commandOpen,
    setCommandOpen,
    refresh,
    homeHref,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole(): ConsoleState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useConsole must be used inside <ConsoleProvider>');
  return v;
}

/** Build a staff API URL scoped to the selected property (null until known). */
export function usePropertyUrl(path: string, params: Record<string, string | number | undefined> = {}): string | null {
  const { propertyId } = useConsole();
  if (!propertyId) return null;
  const q = new URLSearchParams({ propertyId });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  return `${path}?${q.toString()}`;
}
