'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Copy, KeyRound, MoreHorizontal, Search, UserPlus, Users } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { roleLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { ConfirmDialog } from '@/components/frontdesk/dialogs';
import { useConsole } from '@/components/console/ConsoleProvider';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  assignedProperties: { property: { id: string; name: string } }[];
  _count: { bookings: number };
}

const STAFF_ROLES = [
  { value: 'MANAGER', desc: 'Runs operations: front desk, housekeeping, rates and the team.' },
  { value: 'FRONT_DESK', desc: 'Arrivals, check-in and check-out, reservations and the agent.' },
  { value: 'HOUSEKEEPER', desc: 'Their cleaning list, designed for a phone.' },
  { value: 'OWNER', desc: 'Everything, including properties, rates and team.' },
];

function tempPassword() {
  const words = ['harbor', 'maple', 'cedar', 'coral', 'linen', 'amber', 'willow', 'ember', 'tide', 'meadow'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${Math.floor(100 + Math.random() * 900)}`;
}

function RoleChooser({ value, onChange, allowOwner }: { value: string; onChange: (v: string) => void; allowOwner: boolean }) {
  return (
    <div className="grid gap-2">
      {STAFF_ROLES.filter((r) => allowOwner || r.value !== 'OWNER').map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition-colors', value === r.value ? 'border-primary/50 bg-primary-soft/50 ring-1 ring-primary/30' : 'hover:bg-accent')}
        >
          <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', value === r.value && 'border-primary bg-primary text-primary-foreground')}>
            {value === r.value && <Check className="h-2.5 w-2.5" />}
          </span>
          <span>
            <span className="block text-sm font-medium">{roleLabel(r.value)}</span>
            <span className="block text-xs text-muted-foreground">{r.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function PropertyChecks({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { ctx } = useConsole();
  const props = ctx?.properties ?? [];
  if (props.length <= 1) return null;
  return (
    <Field label="Works at">
      <div className="flex flex-wrap gap-2">
        {props.map((p) => {
          const on = value.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== p.id) : [...value, p.id])}
              className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors', on ? 'border-primary/50 bg-primary-soft text-primary' : 'hover:bg-accent')}
            >
              {on && <Check className="h-3.5 w-3.5" />} {p.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { propertyId, role: myRole } = useConsole();
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', role: 'FRONT_DESK', password: tempPassword() });
  const [props, setProps] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [created, setCreated] = React.useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({ firstName: '', lastName: '', email: '', role: 'FRONT_DESK', password: tempPassword() });
      setProps(propertyId ? [propertyId] : []);
      setCreated(null);
      setCopied(false);
    }
  }, [open, propertyId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        json: { ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), assignedPropertyIds: props },
      });
      setCreated({ email: form.email.trim().toLowerCase(), password: form.password, name: form.firstName.trim() });
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const credentials = created ? `Sign in at ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nEmail: ${created.email}\nTemporary password: ${created.password}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} is on the team</DialogTitle>
              <DialogDescription>Share these sign-in details privately. They can change the password from their profile.</DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap rounded-xl border bg-muted/60 p-4 font-mono text-xs">{credentials}</pre>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(credentials);
                    setCopied(true);
                  } catch {
                    toast.error('Couldn’t copy — select the text instead.');
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy details'}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Add a teammate</DialogTitle>
              <DialogDescription>They’ll see only what their role needs.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" htmlFor="inv-first">
                  <Input id="inv-first" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </Field>
                <Field label="Last name" htmlFor="inv-last">
                  <Input id="inv-last" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Work email" htmlFor="inv-email">
                <Input id="inv-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Role">
                <RoleChooser value={form.role} onChange={(role) => setForm({ ...form, role })} allowOwner={myRole === 'ADMIN' || myRole === 'OWNER'} />
              </Field>
              <PropertyChecks value={props} onChange={setProps} />
              <Field label="Temporary password" htmlFor="inv-pass" hint="At least 8 characters.">
                <div className="flex gap-2">
                  <Input id="inv-pass" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" minLength={8} required />
                  <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, password: tempPassword() })} aria-label="Generate another password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!props.length}>
                Add teammate
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ user, onClose, onDone }: { user: UserRow | null; onClose: () => void; onDone: () => void }) {
  const { role: myRole } = useConsole();
  const [role, setRole] = React.useState('');
  const [props, setProps] = React.useState<string[]>([]);
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setProps(user.assignedProperties.map((a) => a.property.id));
    setPhone(user.phone ?? '');
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        json: { ...(role !== user.role ? { role } : {}), assignedPropertyIds: props, phone: phone.trim() || null },
      });
      toast.success(`${user.firstName} updated`);
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {user?.firstName} {user?.lastName}
          </DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Role">
            <RoleChooser value={role} onChange={setRole} allowOwner={myRole === 'ADMIN' || myRole === 'OWNER'} />
          </Field>
          <PropertyChecks value={props} onChange={setProps} />
          <Field label="Phone" htmlFor="edit-phone">
            <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { ctx, can } = useConsole();
  const { data, isLoading, mutate } = useSWR<UserRow[]>('/api/admin/users', fetcher);
  const [tab, setTab] = React.useState<'team' | 'guests'>('team');
  const [q, setQ] = React.useState('');
  const [invite, setInvite] = React.useState(false);
  const [edit, setEdit] = React.useState<UserRow | null>(null);
  const [confirm, setConfirm] = React.useState<{ user: UserRow; action: 'deactivate' | 'reactivate' | 'reset' } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const editable = can('users.write');

  const list = (data ?? [])
    .filter((u) => (tab === 'team' ? u.role !== 'CUSTOMER' : u.role === 'CUSTOMER'))
    .filter((u) => {
      const t = q.trim().toLowerCase();
      return !t || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(t);
    });
  const teamCount = (data ?? []).filter((u) => u.role !== 'CUSTOMER').length;
  const guestCount = (data ?? []).length - teamCount;

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      const { user, action } = confirm;
      if (action === 'reset') {
        await api(`/api/admin/users/${user.id}`, { method: 'PATCH', json: { password: newPassword } });
        toast.success(`New password set for ${user.firstName}: ${newPassword}`, { duration: 15000 });
      } else {
        await api(`/api/admin/users/${user.id}`, { method: 'PATCH', json: { isActive: action === 'reactivate' } });
        toast.success(action === 'reactivate' ? `${user.firstName} can sign in again` : `${user.firstName} can no longer sign in`);
      }
      await mutate();
      setConfirm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Team"
        description="Who can sign in to the console, and what each role can do."
        actions={
          editable ? (
            <Button onClick={() => setInvite(true)}>
              <UserPlus className="h-4 w-4" /> Add teammate
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl
          layoutId="team-tab"
          aria-label="People"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'team', label: `Team${data ? ` · ${teamCount}` : ''}` },
            { value: 'guests', label: `Guests${data ? ` · ${guestCount}` : ''}` },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" aria-label="Search people" />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-none" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={Users} title={q ? 'Nobody matches' : tab === 'team' ? 'Just you so far' : 'No guests yet'} description={tab === 'team' && !q ? 'Add your front desk and housekeeping team so they can use the console.' : undefined} />
        ) : (
          <ul className="divide-y">
            {list.map((u) => {
              const me = u.id === ctx?.user.id;
              return (
                <li key={u.id} className={cn('flex items-center gap-3 px-4 py-3', !u.isActive && 'opacity-60')}>
                  <Avatar name={`${u.firstName} ${u.lastName}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.firstName} {u.lastName}
                      {me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      {!u.isActive && <span className="ml-1.5 rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">Deactivated</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                      {tab === 'guests' && ` · ${u._count.bookings} booking${u._count.bookings === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  {tab === 'team' && (
                    <div className="hidden min-w-0 text-right sm:block">
                      <span className="inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{roleLabel(u.role)}</span>
                      {(ctx?.properties.length ?? 0) > 1 && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u.assignedProperties.map((a) => a.property.name).join(', ') || 'All properties'}</p>
                      )}
                    </div>
                  )}
                  {editable && tab === 'team' && !me && u.role !== 'ADMIN' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.firstName}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEdit(u)}>Change role & access</DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setNewPassword(tempPassword());
                            setConfirm({ user: u, action: 'reset' });
                          }}
                        >
                          Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.isActive ? (
                          <DropdownMenuItem destructive onSelect={() => setConfirm({ user: u, action: 'deactivate' })}>
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setConfirm({ user: u, action: 'reactivate' })}>Reactivate</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <InviteDialog open={invite} onOpenChange={setInvite} onDone={() => void mutate()} />
      <EditDialog user={edit} onClose={() => setEdit(null)} onDone={() => void mutate()} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.action === 'reset'
            ? `Reset ${confirm.user.firstName}’s password?`
            : confirm?.action === 'reactivate'
              ? `Reactivate ${confirm?.user.firstName}?`
              : `Deactivate ${confirm?.user.firstName}?`
        }
        description={
          confirm?.action === 'reset'
            ? 'Their current password stops working right away. Share the new one privately.'
            : confirm?.action === 'reactivate'
              ? 'They’ll be able to sign in again with their existing password.'
              : 'They’re signed out on their next request. Their history stays in the activity log.'
        }
        confirmLabel={confirm?.action === 'reset' ? 'Set new password' : confirm?.action === 'reactivate' ? 'Reactivate' : 'Deactivate'}
        destructive={confirm?.action === 'deactivate'}
        loading={busy}
        onConfirm={runConfirm}
      >
        {confirm?.action === 'reset' && (
          <div className="flex gap-2">
            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" aria-label="New password" />
            <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(tempPassword())} aria-label="Generate another">
              <KeyRound className="h-4 w-4" />
            </Button>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
