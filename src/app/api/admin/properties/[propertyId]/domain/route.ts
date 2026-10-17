import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAppHost, normalizeDomain, toggleWww } from '@/lib/domain-utils';
import {
  addDomainToHosting,
  checkDomainDns,
  getDnsInstructions,
  isHostingManaged,
  removeDomainFromHosting,
  verifyDomainWithHosting,
} from '@/lib/custom-domains';

const domainFields = {
  customDomain: true,
  customDomainVerified: true,
  customDomainVerifiedAt: true,
} as const;

type DomainFields = {
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: Date | null;
};

// Admins manage every property; owners manage the properties assigned to them
async function canManageProperty(propertyId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === 'ADMIN') return true;
  if (session.user.role !== 'OWNER') return false;

  const assignment = await prisma.userPropertyAssignment.findUnique({
    where: { userId_propertyId: { userId: session.user.id, propertyId } },
  });
  return assignment !== null;
}

function domainStatus(property: DomainFields) {
  return {
    domain: property.customDomain,
    verified: property.customDomainVerified,
    verifiedAt: property.customDomainVerifiedAt,
    dnsRecords: property.customDomain ? getDnsInstructions(property.customDomain) : [],
    hostingManaged: isHostingManaged(),
  };
}

// GET the property's custom domain and the DNS records it needs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!(await canManageProperty(propertyId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: domainFields,
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(domainStatus(property));
  } catch (error) {
    console.error('Error fetching custom domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT connect a domain (or replace the current one)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!(await canManageProperty(propertyId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const domain = typeof body.domain === 'string' ? normalizeDomain(body.domain) : null;

    if (!domain) {
      return NextResponse.json(
        { error: 'Enter a valid domain, like book.yourmotel.com' },
        { status: 400 }
      );
    }

    if (isAppHost(domain)) {
      return NextResponse.json(
        { error: 'That domain belongs to the booking site itself' },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: domainFields,
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.customDomain === domain) {
      return NextResponse.json(domainStatus(property));
    }

    // Render pairs every domain with its www/root counterpart, so both are taken
    const domainInUse = await prisma.property.findFirst({
      where: {
        customDomain: { in: [domain, toggleWww(domain)] },
        id: { not: propertyId },
      },
      select: { id: true },
    });

    if (domainInUse) {
      return NextResponse.json(
        { error: 'Another property is already using this domain' },
        { status: 409 }
      );
    }

    try {
      await addDomainToHosting(domain);
    } catch (error) {
      console.error('Error adding domain to Render:', error);
      return NextResponse.json(
        { error: `Couldn't set up hosting for ${domain}: ${error instanceof Error ? error.message : 'unknown error'}` },
        { status: 502 }
      );
    }

    if (property.customDomain) {
      await removeDomainFromHosting(property.customDomain);
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        customDomain: domain,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
      },
      select: domainFields,
    });

    return NextResponse.json(domainStatus(updatedProperty));
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Another property is already using this domain' },
        { status: 409 }
      );
    }

    console.error('Error saving custom domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST check the domain's DNS and turn it on once it points here
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!(await canManageProperty(propertyId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: domainFields,
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (!property.customDomain) {
      return NextResponse.json({ error: 'Add a domain first' }, { status: 400 });
    }

    const dnsCheck = await checkDomainDns(property.customDomain);

    let hostingVerified: boolean | null = false;
    if (dnsCheck.pointsToApp) {
      try {
        hostingVerified = await verifyDomainWithHosting(property.customDomain);
      } catch (error) {
        console.error('Error verifying domain with Render:', error);
        return NextResponse.json(
          { error: `Couldn't check the domain with the hosting provider: ${error instanceof Error ? error.message : 'unknown error'}` },
          { status: 502 }
        );
      }
    }

    // When hosting isn't managed from here (null), DNS pointing here is all we can check
    const verified = dnsCheck.pointsToApp && hostingVerified !== false;

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        customDomainVerified: verified,
        customDomainVerifiedAt: verified ? property.customDomainVerifiedAt ?? new Date() : null,
      },
      select: domainFields,
    });

    return NextResponse.json({
      ...domainStatus(updatedProperty),
      check: { ...dnsCheck, hostingVerified },
    });
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE disconnect the domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!(await canManageProperty(propertyId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: domainFields,
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.customDomain) {
      await removeDomainFromHosting(property.customDomain);
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
      },
      select: domainFields,
    });

    return NextResponse.json(domainStatus(updatedProperty));
  } catch (error) {
    console.error('Error removing custom domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
