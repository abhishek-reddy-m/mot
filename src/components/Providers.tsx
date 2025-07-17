'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      // Check session every minute in production
      refetchInterval={60}
      // Check session when window gets focus
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
