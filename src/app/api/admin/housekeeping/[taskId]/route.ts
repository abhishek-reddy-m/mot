import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET single housekeeping task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.roomHousekeeping.findUnique({
      where: { id: taskId },
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
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching housekeeping task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update housekeeping task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const { status, assignedTo, priority, notes } = await request.json();

    const existingTask = await prisma.roomHousekeeping.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (status !== undefined) {
      updateData.status = status;
      
      // If completed, set completedAt
      if (status === 'COMPLETED' || status === 'INSPECTED') {
        updateData.completedAt = new Date();
        
        // Also update room status
        await prisma.room.update({
          where: { id: existingTask.roomId },
          data: { 
            status: status === 'INSPECTED' ? 'INSPECTED' : 'CLEAN' 
          }
        });
      }
    }
    
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    const task = await prisma.roomHousekeeping.update({
      where: { id: taskId },
      data: updateData,
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

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating housekeeping task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE housekeeping task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    await prisma.roomHousekeeping.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting housekeeping task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
