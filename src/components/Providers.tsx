'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { isConsolePath } from '@/lib/routes';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  // Guest-facing pages are always light (they carry the hotel's brand);
  // only the staff console follows the user's theme choice.
  const forcedTheme = isConsolePath(pathname) ? undefined : 'light';

  return (
    <SessionProvider refetchOnWindowFocus>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        forcedTheme={forcedTheme}
        storageKey="stayos-theme"
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: 'rounded-xl border shadow-lifted font-sans' } }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
