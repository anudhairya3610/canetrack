export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NoteType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
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
    if (!body.plotId) {
      return NextResponse.json({ error: 'Plot is required' }, { status: 400 });
    }

    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findFirst({
      where: { id: body.plotId, userId: session.userId },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    // Validate NoteType enum
    const validNoteTypes = Object.values(NoteType);
    const noteType = validNoteTypes.includes(body.noteType as NoteType)
      ? (body.noteType as NoteType)
      : NoteType.general;

    const note = await prisma.plotNote.create({
      data: {
        plotId: body.plotId,
        noteType,
        content: body.content.trim(),
        date: new Date(body.date || Date.now()),
      },
      include: { images: true },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}