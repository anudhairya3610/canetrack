export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const activity = await prisma.activity.create({
    data: {
      plotId: body.plotId,
      activityType: body.activityType,
      description: body.description || null,
      date: new Date(body.date || Date.now()),
    },
  });
  return NextResponse.json(activity);
}

