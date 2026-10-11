import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

// GET a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        assignedProperties: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, firstName, lastName, phone, role, isActive, assignedPropertyIds } = body;

    // Build update data
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role as UserRole;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user and property assignments in transaction
    const user = await prisma.$transaction(async (tx: any) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Update property assignments if provided
      if (assignedPropertyIds !== undefined) {
        // Delete existing assignments
        await tx.userPropertyAssignment.deleteMany({
          where: { userId }
        });

        // Create new assignments
        if (assignedPropertyIds.length > 0) {
          await tx.userPropertyAssignment.createMany({
            data: assignedPropertyIds.map((propertyId: string) => ({
              userId,
              propertyId,
            }))
          });
        }
      }

      return updatedUser;
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Don't allow deleting yourself
    if (session.user.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user has bookings
    const bookingCount = await prisma.booking.count({
      where: { userId }
    });

    if (bookingCount > 0) {
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
      return NextResponse.json({ message: 'User deactivated (has existing bookings)' });
    }

    // Hard delete if no bookings
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
