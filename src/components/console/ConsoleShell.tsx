'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsUpDown, Command, ExternalLink, LogOut, Menu, Monitor, Moon, Plus, Sparkles, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/status';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Avatar, Kbd, Skeleton } from '@/components/ui/primitives';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConsole } from './ConsoleProvider';
import { ModeSwitch } from './ModeSwitch';
import { navFor, titleFor, type NavGroup } from './nav';
import { CommandSheet } from './CommandSheet';
import { ApiError } from '@/lib/fetcher';

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Console">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{g.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      active ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {active && <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" />}
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', item.agent && !active && 'text-agent')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.agent && (
                      <span className="ml-auto rounded-full bg-agent-soft px-1.5 py-px text-[10px] font-semibold text-agent">AI</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function PropertySwitcher() {
  const { ctx, property, setPropertyId, can } = useConsole();
  const router = useRouter();
  if (!ctx || !property) return <Skeleton className="h-9 w-40" />;
  const single = ctx.properties.length === 1;
  const swatch = (color: string | null) => (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background" style={{ backgroundColor: color ?? 'hsl(var(--primary))' }} />
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 max-w-[220px] items-center gap-2 rounded-lg border bg-surface px-2.5 text-[13px] font-medium shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {swatch(property.primaryColor)}
          <span className="truncate">{property.name}</span>
          {property.isDemo && <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">demo</span>}
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{single ? 'Your property' : 'Switch property'}</DropdownMenuLabel>
        {ctx.properties.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => setPropertyId(p.id)}>
            {swatch(p.primaryColor)}
            <span className="flex-1 truncate">
              {p.name}
              <span className="block text-xs text-muted-foreground">
                {p.city}, {p.state}
              </span>
            </span>
            {p.id === property.id && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`/properties/${property.id}`, '_blank')}>
          <ExternalLink /> View booking site
        </DropdownMenuItem>
        {can('property.create') && (
          <DropdownMenuItem onSelect={() => router.push('/admin/properties/add')}>
            <Plus /> Add a property
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { ctx } = useConsole();
  const { theme, setTheme } = useTheme();
  if (!ctx) return <Skeleton className="h-9 w-9 rounded-full" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
          <Avatar name={ctx.user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{ctx.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {roleLabel(ctx.user.role)} · {ctx.user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? 'light'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="text-muted-foreground" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="text-muted-foreground" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="text-muted-foreground" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => signOut({ callbackUrl: '/login' })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellGate({ children }: { children: React.ReactNode }) {
  const { ctx, error, property } = useConsole();
  const router = useRouter();
  React.useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
  }, [error, router]);
  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">This area is for hotel staff</h1>
        <p className="mt-2 text-sm text-muted-foreground">You’re signed in with a guest account.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go to my trips</Link>
        </Button>
      </div>
    );
  }
  if (ctx && ctx.properties.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-6 text-xl font-semibold">No property yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ctx.user.role === 'OWNER' || ctx.user.role === 'ADMIN'
            ? 'Set up your first property to open the console.'
            : 'Ask your manager to add you to a property, then sign in again.'}
        </p>
        {(ctx.user.role === 'OWNER' || ctx.user.role === 'ADMIN') && (
          <Button asChild className="mt-6">
            <Link href="/admin/properties/add">Add your property</Link>
          </Button>
        )}
      </div>
    );
  }
  if (!ctx || !property) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  return <>{children}</>;
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { ctx, mode, role, setCommandOpen, can, property } = useConsole();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const agentic = mode === 'AGENTIC';
  const groups = navFor(role, { agentEnabled: can('agent.use'), setupPath: property?.setupPath });
  const collapsed = agentic;

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar — narrows to icons in Agentic mode to give the conversation room. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-surface transition-[width] duration-300 ease-out lg:flex',
          collapsed ? 'w-[68px]' : 'w-[248px]'
        )}
      >
        <div className={cn('flex h-14 items-center border-b', collapsed ? 'justify-center' : 'px-4')}>
          <Link href="/admin" aria-label="Console home">
            <Logo compact={collapsed} />
          </Link>
        </div>
        <div className={cn('flex-1 overflow-y-auto py-4 scrollbar-thin', collapsed ? 'px-2' : 'px-3')}>
          <NavList groups={groups} collapsed={collapsed} />
        </div>
        {!collapsed && can('agent.use') && (
          <div className="p-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="ring-aurora group w-full rounded-xl bg-agent-soft/60 p-3 text-left transition-colors hover:bg-agent-soft"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <Sparkles className="h-4 w-4 text-agent" />
                Ask the agent
                <span className="ml-auto flex gap-0.5">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">“Check in the Smiths, quiet room on a high floor.”</p>
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b">
          <AnimatePresence>
            {agentic && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-aurora animate-aurora absolute inset-x-0 top-0 h-[2px] origin-left"
              />
            )}
          </AnimatePresence>
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu />
            </Button>
            <div className="hidden min-w-0 sm:block">
              <PropertySwitcher />
            </div>
            <h1 className="truncate text-sm font-medium text-muted-foreground sm:hidden">{titleFor(pathname)}</h1>
            <div className="ml-auto flex items-center gap-2">
              {(property?.setupPath ?? 'FULL') === 'FULL' && (
                <>
                  <div className="hidden sm:block">
                    <ModeSwitch />
                  </div>
                  <div className="sm:hidden">
                    <ModeSwitch size="sm" />
                  </div>
                </>
              )}
              {!agentic && can('agent.use') && property?.setupPath !== 'VOICE' && (
                <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" onClick={() => setCommandOpen(true)}>
                  <Command className="h-3.5 w-3.5" />
                  <span>Ask</span>
                  <Kbd className="ml-1">⌘K</Kbd>
                </Button>
              )}
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="relative min-w-0 flex-1">
          <ShellGate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode + (pathname.startsWith('/admin/agent') ? ':agent' : '')}
                initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
                // Clear filter/transform once settled: either one would make this
                // wrapper the containing block for position:fixed children.
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }}
                exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </ShellGate>
        </main>
      </div>

      {/* Mobile navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <Logo />
          </div>
          <div className="space-y-4 overflow-y-auto p-3">
            <PropertySwitcher />
            <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
          </div>
          {ctx && (
            <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{ctx.user.name}</span> · {roleLabel(ctx.user.role)}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CommandSheet />
    </div>
  );
}
