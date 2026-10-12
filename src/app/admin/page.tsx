'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConsole } from '@/components/console/ConsoleProvider';

/** /admin → the right home for this person's role and chosen mode. */
export default function ConsoleHome() {
  const { ctx, property, mode, homeHref } = useConsole();
  const router = useRouter();
  useEffect(() => {
    if (!ctx || !property) return;
    router.replace(mode === 'AGENTIC' ? '/admin/agent' : homeHref);
  }, [ctx, property, mode, homeHref, router]);
  return null;
}
