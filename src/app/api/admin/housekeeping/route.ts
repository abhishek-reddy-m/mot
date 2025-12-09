import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all housekeeping tasks
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    const where: any = {};
    
    if (propertyId) {
      where.room = {
        propertyId
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    const tasks = await prisma.roomHousekeeping.findMany({
      where,
      include: {
        room: {
          include: {
            roomType: {
              select: {
                id: true,
                name: true,
              }
            },
            property: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching housekeeping tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new housekeeping task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, assignedTo, status, priority, notes } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check for existing pending/in-progress task for this room
    const existingTask = await prisma.roomHousekeeping.findFirst({
      where: {
        roomId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });

    if (existingTask) {
      // Update existing task instead of creating new one
      const updatedTask = await prisma.roomHousekeeping.update({
        where: { id: existingTask.id },
        data: {
          assignedTo: assignedTo || existingTask.assignedTo,
          status: status || existingTask.status,
          priority: priority || existingTask.priority,
          notes: notes || existingTask.notes,
        },
        include: {
          room: {
            include: {
              roomType: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      return NextResponse.json(updatedTask);
    }

    // Create new task
    const task = await prisma.roomHousekeeping.create({
      data: {
        roomId,
        assignedTo: assignedTo || null,
        status: status || 'PENDING',
        priority: priority || 1,
        notes: notes || null,
      },
      include: {
        room: {
          include: {
            roomType: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating housekeeping task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
