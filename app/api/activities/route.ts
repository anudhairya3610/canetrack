export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');

    const activities = await prisma.activity.findMany({
      where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
      include: { images: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('GET /api/activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
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

    if (!body.activityType || !body.activityType.trim()) {
      return NextResponse.json({ error: 'Activity type is required' }, { status: 400 });
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findFirst({
      where: { id: body.plotId, userId: session.userId },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const activity = await prisma.activity.create({
      data: {
        plotId: body.plotId,
        activityType: body.activityType.trim(),
        description: body.description || null,
        date: new Date(body.date || Date.now()),
      },
      include: { images: true },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}