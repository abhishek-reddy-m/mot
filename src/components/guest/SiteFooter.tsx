import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { PRODUCT_NAME, PRODUCT_SUPPORT_EMAIL } from '@/config/product';

const COLUMNS = [
  {
    title: 'Travellers',
    links: [
      { href: '/properties', label: 'Find a stay' },
      { href: '/dashboard', label: 'My trips' },
      { href: '/register', label: 'Create an account' },
    ],
  },
  {
    title: 'Hotels',
    links: [
      { href: '/#agent', label: 'The agent' },
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/onboarding', label: 'Set up your hotel' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/login', label: 'Staff sign in' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface-sunken/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Direct booking and an AI front desk for independent hotels.</p>
          <a href={`mailto:${PRODUCT_SUPPORT_EMAIL}`} className="mt-3 inline-block text-sm text-primary hover:underline">
            {PRODUCT_SUPPORT_EMAIL}
          </a>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {PRODUCT_NAME}. Built for the people who keep the lights on.
        </p>
      </div>
    </footer>
  );
}
