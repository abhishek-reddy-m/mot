import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { PRODUCT_NAME } from '@/config/product';

/** Split auth layout: form on the left, brand story on the right. */
export function AuthLayout({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="w-fit" aria-label={`${PRODUCT_NAME} home`}>
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PRODUCT_NAME} ·{' '}
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>{' '}
          ·{' '}
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </p>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <div className="bg-aurora animate-aurora absolute inset-0 opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">{aside}</div>
      </div>
    </div>
  );
}
