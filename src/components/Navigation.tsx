'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { CalendarCheck2, LayoutDashboard, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { isStaffRole } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/primitives';
import { Logo } from '@/components/brand/Logo';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MARKETING_LINKS = [
  { href: '/#agent', label: 'The agent' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
];
const GUEST_LINKS = [
  { href: '/properties', label: 'Find a stay', icon: Search },
  { href: '/dashboard', label: 'My trips', icon: CalendarCheck2, auth: true },
];

/**
 * Site navigation. `marketing` is the product site (for hotels); `guest`
 * is the booking experience (for travellers).
 */
export default function Navigation({
  variant = 'guest',
  className,
  brand,
}: {
  variant?: 'marketing' | 'guest';
  className?: string;
  /** White-label: show the hotel's name instead of the platform logo. */
  brand?: { name: string; href: string };
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const user = session?.user;
  const staff = isStaffRole(user?.role);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = variant === 'marketing' ? MARKETING_LINKS.map((l) => ({ ...l, icon: undefined, auth: false })) : GUEST_LINKS.filter((l) => !l.auth || user);

  return (
    <header className={cn('sticky top-0 z-50 transition-all duration-300', scrolled ? 'glass border-b shadow-xs' : 'border-b border-transparent bg-background/0', className)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {brand ? (
          <Link href={brand.href} className="min-w-0 shrink truncate font-display text-xl tracking-tight text-brand">
            {brand.name}
          </Link>
        ) : (
          <Link href="/" className="shrink-0" aria-label="StayOS home">
            <Logo />
          </Link>
        )}

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => {
            const active = !l.href.includes('#') && pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {l.label}
              </Link>
            );
          })}
          {variant === 'marketing' && (
            <Link href="/properties" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              Guest demo
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <>
              {staff && (
                <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" /> Console
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                    <Avatar name={user.name ?? user.email ?? 'You'} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {staff && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="h-4 w-4" /> Hotel console
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <CalendarCheck2 className="h-4 w-4" /> My trips
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserRound className="h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/' })}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={`/login${pathname && pathname !== '/' ? `?callbackUrl=${encodeURIComponent(pathname)}` : ''}`}>Sign in</Link>
              </Button>
              {variant === 'marketing' ? (
                <Button asChild size="sm">
                  <Link href="/onboarding">Start free</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                  <Link href="/register">Create account</Link>
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center border-b px-5">
            <Logo />
          </div>
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {[...links, ...(variant === 'marketing' ? [{ href: '/properties', label: 'Guest demo', icon: undefined, auth: false }] : [])].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-accent">
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {user ? (
              <>
                {staff && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-accent">
                    Hotel console
                  </Link>
                )}
                <Link href="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-accent">
                  Profile
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg px-3 py-2.5 text-left text-[15px] font-medium hover:bg-accent">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-accent">
                  Sign in
                </Link>
                <Link href={variant === 'marketing' ? '/onboarding' : '/register'} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-primary hover:bg-accent">
                  {variant === 'marketing' ? 'Set up your hotel' : 'Create account'}
                </Link>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
