import type { Metadata } from 'next';
import { ConsoleProvider } from '@/components/console/ConsoleProvider';
import { ConsoleShell } from '@/components/console/ConsoleShell';

export const metadata: Metadata = { title: 'Console' };

/** One console for every staff role; navigation and pages adapt to the role. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleProvider>
  );
}
