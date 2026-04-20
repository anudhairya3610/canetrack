import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plotId = searchParams.get('plotId');

  const notes = await prisma.plotNote.findMany({
    where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
    include: { images: true, reminder: true },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const note = await prisma.plotNote.create({
    data: {
      plotId: body.plotId,
      noteType: body.noteType || 'general',
      content: body.content,
      date: new Date(body.date || Date.now()),
    },
    include: { images: true },
  });

  return NextResponse.json(note);
}
