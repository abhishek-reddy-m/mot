import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Bot, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/product';
import InterfaceModeToggle from './InterfaceModeToggle';

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/owner');

  const role = (session.user as { role?: string }).role ?? 'CUSTOMER';
  const isAdmin = role === 'ADMIN';
  const { welcome } = await searchParams;

  const properties = await prisma.property.findMany({
    where: isAdmin ? {} : { assignedUsers: { some: { userId: session.user.id } } },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      tagline: true,
      primaryColor: true,
      type: true,
      isActive: true,
      isDemo: true,
      interfaceMode: true,
      _count: { select: { bookings: true, roomTypes: true, rooms: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {welcome && (
          <div className="mb-8 rounded-2xl bg-cyan-700 text-white p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
              Welcome to {PRODUCT_NAME}! 🎉
            </h1>
            <p className="text-cyan-100">
              Your property is set up. Add room types and rates in the admin panel, then start taking commission-free direct bookings.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">My properties</h1>
            <p className="text-slate-600">Manage your business on {PRODUCT_NAME}.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/agent">
              <Button variant="outline" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Command
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 ml-1">
                  <Sparkles className="h-3 w-3 mr-1" /> Beta
                </Badge>
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard">
                <Button className="bg-cyan-700 hover:bg-cyan-800">Admin panel</Button>
              </Link>
            )}
          </div>
        </div>

        {properties.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No properties yet</h2>
              <p className="text-slate-600 mb-6">Onboard your first hotel to get started.</p>
              <Link href="/onboarding">
                <Button className="bg-cyan-700 hover:bg-cyan-800">
                  <Plus className="h-4 w-4 mr-2" /> Onboard your hotel
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: p.primaryColor || '#0E7490' }} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {p.name}
                        {p.isDemo && <Badge variant="outline" className="text-xs">Demo</Badge>}
                        {!p.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {[p.type, `${p.city}, ${p.state}`].filter(Boolean).join(' · ')}
                      </p>
                      {p.tagline && <p className="text-sm text-slate-600 italic mt-1">“{p.tagline}”</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <div className="text-2xl font-extrabold">{p._count.bookings}</div>
                      <div className="text-slate-500 text-xs">Bookings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold">{p._count.roomTypes}</div>
                      <div className="text-slate-500 text-xs">Room types</div>
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold">{p._count.rooms}</div>
                      <div className="text-slate-500 text-xs">Rooms</div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Interface mode</p>
                    <InterfaceModeToggle
                      propertyId={p.id}
                      propertyName={p.name}
                      initialMode={p.interfaceMode}
                      userRole={role}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link href={`/properties/${p.id}`}>
                      <Button variant="outline" size="sm">
                        View booking site <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                    <Link href={`/agent`}>
                      <Button variant="outline" size="sm">
                        <Bot className="h-3 w-3 mr-1" /> AI Command
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin/dashboard">
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
