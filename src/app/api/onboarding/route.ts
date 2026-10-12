import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const PROPERTY_TYPES = ['Hotel', 'Motel', 'Inn', 'B&B', 'Boutique', 'Other'];

/**
 * Business onboarding: creates the owner account + their property + assignment
 * in one transaction. No payment data is collected here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      propertyName,
      propertyType,
      address,
      city,
      state,
      zipCode,
      phone,
      description,
      tagline,
      primaryColor,
    } = body ?? {};

    // ---- validation ----
    const missing: string[] = [];
    if (!firstName?.trim()) missing.push('firstName');
    if (!lastName?.trim()) missing.push('lastName');
    if (!email?.trim()) missing.push('email');
    if (!password) missing.push('password');
    if (!propertyName?.trim()) missing.push('propertyName');
    if (!address?.trim()) missing.push('address');
    if (!city?.trim()) missing.push('city');
    if (!state?.trim()) missing.push('state');
    if (!zipCode?.trim()) missing.push('zipCode');
    if (!phone?.trim()) missing.push('phone');
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (propertyType && !PROPERTY_TYPES.includes(propertyType)) {
      return NextResponse.json({ message: 'Invalid property type' }, { status: 400 });
    }
    if (primaryColor && !HEX_COLOR_RE.test(primaryColor)) {
      return NextResponse.json({ message: 'Primary color must be a hex value like #0E7490' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password: passwordHash,
          role: 'OWNER',
        },
      });

      const property = await tx.property.create({
        data: {
          name: propertyName.trim(),
          type: propertyType ?? 'Hotel',
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          phone: phone.trim(),
          description: description?.trim() || null,
          tagline: tagline?.trim() || null,
          primaryColor: primaryColor || null,
          amenities: [],
          isActive: true,
          isDemo: false,
        },
      });

      await tx.userPropertyAssignment.create({
        data: { userId: user.id, propertyId: property.id },
      });

      return { user, property };
    });

    const { password: _pw, ...safeUser } = result.user;

    return NextResponse.json(
      {
        message: 'Onboarding complete',
        user: safeUser,
        property: { id: result.property.id, name: result.property.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
