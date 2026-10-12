import { cn } from '@/lib/utils';

/** Public demo: the staff logins are shared, so guests shouldn't enter real details. */
export function PublicDemoNote({ className }: { className?: string }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  return (
    <p className={cn('rounded-xl bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning', className)}>
      This is a public demo — anyone using a staff demo login can see guest details, so use a made-up name and email.
    </p>
  );
}
