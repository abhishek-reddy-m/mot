'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bot, Globe, Loader2, Plus, RefreshCw, Settings2 } from 'lucide-react';
import { apiJson, CHANNEL_NAMES, ChannelBadge, ModeBadge, StatusBadge, timeAgo } from '@/components/channels/ChannelBadges';

type Connection = {
  id: string;
  channel: string;
  mode: string;
  status: string;
  otaPropertyId: string | null;
  otaPropertyName: string | null;
  defaultMarkupPercent: number;
  lastAriSyncAt: string | null;
  lastReservationPullAt: string | null;
  lastError: string | null;
  _count: { roomMappings: number; promotions: number; reservations: number };
};

type PropertyRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  _count: { roomTypes: number };
  channelConnections: Connection[];
};

type Overview = {
  channels: string[];
  properties: PropertyRow[];
  recentReservations: Array<{
    id: string;
    externalId: string;
    status: string;
    guestName: string | null;
    totalAmount: string | null;
    currency: string | null;
    receivedAt: string;
    connection: { channel: string; property: { name: string } };
    booking: { id: string; checkIn: string; checkOut: string; status: string; roomType: { name: string } } | null;
  }>;
  recentLogs: Array<{
    id: string;
    action: string;
    status: string;
    message: string;
    createdAt: string;
    connection: { channel: string; property: { name: string } };
  }>;
};

const CHANNEL_INFO: Record<string, string> = {
  EXPEDIA: 'Expedia, Hotels.com, Vrbo and the Expedia Group network',
  BOOKING_COM: 'Booking.com and its partner network',
};

export default function ChannelManagerPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await apiJson<Overview>(await fetch('/api/admin/channels', { cache: 'no-store' })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const syncNow = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      await apiJson(
        await fetch(`/api/admin/channels/${connectionId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' }),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(null);
      load();
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channel Manager</h1>
          <p className="text-gray-500">Distribute rooms on Expedia and Booking.com and keep rates and availability in sync</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/channel-agent">
              <Bot className="h-4 w-4 mr-1" />
              Ask the Channel Agent
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {data?.properties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">Add a property first to connect it to OTAs.</CardContent>
        </Card>
      )}

      {data?.properties.map((property) => (
        <Card key={property.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{property.name}</CardTitle>
            <CardDescription>
              {property.city}, {property.state} &middot; {property._count.roomTypes} room types
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.channels.map((channel) => {
              const connection = property.channelConnections.find((c) => c.channel === channel);
              if (!connection) {
                return (
                  <div key={channel} className="rounded-lg border border-dashed p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <ChannelBadge channel={channel} />
                      <span className="text-xs text-gray-500">Not connected</span>
                    </div>
                    <p className="text-sm text-gray-500">{CHANNEL_INFO[channel]}</p>
                    <Button asChild variant="outline" size="sm" className="self-start">
                      <Link href={`/admin/channels/connect?propertyId=${property.id}&channel=${channel}`}>
                        <Plus className="h-4 w-4 mr-1" />
                        Connect {CHANNEL_NAMES[channel]}
                      </Link>
                    </Button>
                  </div>
                );
              }

              const live = ['ACTIVE', 'PAUSED', 'ERROR'].includes(connection.status);
              return (
                <div key={channel} className="rounded-lg border p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <ChannelBadge channel={channel} />
                    <div className="flex items-center gap-2">
                      <ModeBadge mode={connection.mode} />
                      <StatusBadge status={connection.status} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      {connection.otaPropertyName || 'OTA property'} {connection.otaPropertyId && <span className="text-gray-400">#{connection.otaPropertyId}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{connection._count.roomMappings} rooms mapped</span>
                      <span>{connection.defaultMarkupPercent}% markup</span>
                      <span>{connection._count.promotions} active promotions</span>
                      <span>{connection._count.reservations} OTA bookings</span>
                    </div>
                    {live && <div className="text-xs text-gray-500">Last rate push {timeAgo(connection.lastAriSyncAt)}</div>}
                    {connection.lastError && (
                      <div className="text-xs text-red-600 flex items-start gap-1">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {connection.lastError}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {live ? (
                      <>
                        <Button asChild size="sm">
                          <Link href={`/admin/channels/${connection.id}`}>
                            <Settings2 className="h-4 w-4 mr-1" />
                            Manage
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" disabled={syncing === connection.id} onClick={() => syncNow(connection.id)}>
                          {syncing === connection.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Sync now
                        </Button>
                      </>
                    ) : (
                      <Button asChild size="sm">
                        <Link href={`/admin/channels/connect?connectionId=${connection.id}`}>Continue setup</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Latest OTA reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recentReservations.length ? (
              <p className="text-sm text-gray-500">No reservations received yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.recentReservations.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={r.connection.channel} />
                        <span className="font-medium truncate">{r.guestName}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        #{r.externalId} &middot; {r.connection.property.name}
                        {r.booking && (
                          <>
                            {' '}
                            &middot; {r.booking.roomType.name}, {r.booking.checkIn.slice(0, 10)} to {r.booking.checkOut.slice(0, 10)}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={r.status} />
                      {r.booking && (
                        <Link href={`/admin/bookings/${r.booking.id}`} className="block text-xs text-blue-600 hover:underline mt-1">
                          View booking
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sync activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recentLogs.length ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Connect a channel to start syncing.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {data.recentLogs.map((log) => (
                  <li key={log.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={log.connection.channel} />
                        <span className="text-xs font-mono text-gray-500">{log.action}</span>
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                    </div>
                    <div className={`text-xs mt-1 ${log.status === 'FAILED' ? 'text-red-600' : 'text-gray-600'}`}>{log.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
