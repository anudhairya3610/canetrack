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

  const logs = await prisma.sprayLog.findMany({
    where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
    include: { images: true, reminder: true },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const log = await prisma.sprayLog.create({
    data: {
      plotId: body.plotId,
      sprayType: body.sprayType || 'pesticide',
      description: body.description || null,
      cost: body.cost ? parseFloat(body.cost) : null,
      date: new Date(body.date || Date.now()),
    },
    include: { images: true },
  });

  return NextResponse.json(log);
}

