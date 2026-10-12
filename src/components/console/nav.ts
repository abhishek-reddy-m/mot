import {
  BadgeDollarSign,
  BedDouble,
  Building2,
  CalendarCheck2,
  ChartLine,
  ConciergeBell,
  History,
  LayoutDashboard,
  Settings2,
  Sparkles,
  SprayCan,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { canAccessConsolePath } from '@/lib/routes';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown with the agent's aurora treatment. */
  agent?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Operate',
    items: [
      { label: 'Agent', href: '/admin/agent', icon: Sparkles, agent: true },
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Front desk', href: '/admin/front-desk', icon: ConciergeBell },
      { label: 'Housekeeping', href: '/admin/housekeeping', icon: SprayCan },
      { label: 'Reservations', href: '/admin/bookings', icon: CalendarCheck2 },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Rates', href: '/admin/rate-calendar', icon: BadgeDollarSign },
      { label: 'Analytics', href: '/admin/analytics', icon: ChartLine },
    ],
  },
  {
    label: 'Setup',
    items: [
      { label: 'Rooms', href: '/admin/room-types', icon: BedDouble },
      { label: 'Properties', href: '/admin/properties', icon: Building2 },
      { label: 'Team', href: '/admin/users', icon: Users },
      { label: 'Activity', href: '/admin/activity', icon: History },
      { label: 'Settings', href: '/admin/settings', icon: Settings2 },
    ],
  },
];

/** Navigation filtered to what this role can open (same rules as middleware). */
export function navFor(role: string | undefined, opts: { agentEnabled: boolean }): NavGroup[] {
  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => canAccessConsolePath(role, i.href) && (!i.agent || opts.agentEnabled)),
  })).filter((g) => g.items.length > 0);
}

export function titleFor(pathname: string): string {
  for (const g of GROUPS) for (const i of g.items) if (pathname === i.href || pathname.startsWith(i.href + '/')) return i.label;
  return 'Console';
}
