export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReminderType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reminders = await prisma.reminder.findMany({
      where: { userId: session.userId, isCompleted: false },
      orderBy: { dueDate: 'asc' },
      include: { plot: { select: { name: true } } },
    });

    return NextResponse.json(reminders);
  } catch (error: any) {
    console.error('GET /api/reminders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // --- Validation ---
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }

    // Validate ReminderType enum
    const validTypes = Object.values(ReminderType);
    const type = validTypes.includes(body.type as ReminderType)
      ? (body.type as ReminderType)
      : ReminderType.general;

    // Verify plot belongs to user if provided
    if (body.plotId) {
      const plot = await prisma.plot.findFirst({
        where: { id: body.plotId, userId: session.userId },
      });
      if (!plot) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: session.userId,
        plotId: body.plotId || null,
        noteId: body.noteId || null,
        sprayLogId: body.sprayLogId || null,
        type,
        title: body.title.trim(),
        description: body.description || null,
        dueDate: new Date(body.dueDate),
      },
      include: { plot: { select: { name: true } } },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reminders error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A reminder already exists for this note/spray log' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create reminder' },
      { status: 500 }
    );
  }
}