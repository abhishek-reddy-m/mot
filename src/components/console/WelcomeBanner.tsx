'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';

/** Shown once after onboarding (?welcome=1); dismissing removes the flag from the URL. */
export function WelcomeBanner({ title, children }: { title: string; children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get('welcome') === '1');
  }, []);
  const close = () => {
    setShow(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    window.history.replaceState(null, '', url.toString());
  };
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft">
          <div className="bg-aurora absolute inset-x-0 top-0 h-1" />
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <PartyPopper className="h-4 w-4" /> {title}
          </p>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
          <button onClick={close} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
