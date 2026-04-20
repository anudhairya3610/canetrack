import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.userId, isCompleted: false },
    orderBy: { dueDate: 'asc' },
    include: { plot: { select: { name: true } } },
  });

  return NextResponse.json(reminders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const reminder = await prisma.reminder.create({
    data: {
      userId: session.userId,
      plotId: body.plotId || null,
      noteId: body.noteId || null,
      sprayLogId: body.sprayLogId || null,
      type: body.type,
      title: body.title,
      description: body.description || null,
      dueDate: new Date(body.dueDate),
    },
  });

  return NextResponse.json(reminder);
}
