import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeDomain, toggleWww } from '@/lib/domain-utils';

// GET which property's booking page a custom domain serves (used by middleware)
export async function GET(request: NextRequest) {
  try {
    const domain = normalizeDomain(request.nextUrl.searchParams.get('host') || '');

    if (!domain) {
      return NextResponse.json({ propertyId: null }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: {
        customDomain: { in: [domain, toggleWww(domain)] },
        customDomainVerified: true,
        isActive: true,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { propertyId: property?.id ?? null },
      { status: property ? 200 : 404 }
    );
  } catch (error) {
    console.error('Error resolving custom domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
