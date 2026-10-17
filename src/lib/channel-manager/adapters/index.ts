import type { ChannelConnection } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ChannelAdapter, ChannelCredentials } from '../types';
import { BookingComAdapter } from './booking-com';
import { ExpediaAdapter } from './expedia';
import { SandboxAdapter } from './sandbox';

export function credentialsFor(connection: ChannelConnection): ChannelCredentials {
  return {
    channel: connection.channel,
    mode: connection.mode,
    otaPropertyId: connection.otaPropertyId ?? '',
    username: connection.username ?? '',
    password: connection.password ? decrypt(connection.password) : '',
    currency: connection.currency,
  };
}

export async function getAdapter(connection: ChannelConnection): Promise<ChannelAdapter> {
  const creds = credentialsFor(connection);

  if (connection.mode === 'SANDBOX') {
    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId: connection.propertyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return new SandboxAdapter(creds, roomTypes);
  }

  switch (connection.channel) {
    case 'EXPEDIA':
      return new ExpediaAdapter(creds);
    case 'BOOKING_COM':
      return new BookingComAdapter(creds);
  }
}
