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

  const logs = await prisma.irrigationLog.findMany({
    where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const log = await prisma.irrigationLog.create({
    data: {
      plotId: body.plotId,
      date: new Date(body.date || Date.now()),
      irrigationType: body.irrigationType,
      durationHours: body.durationHours ? parseFloat(body.durationHours) : null,
      waterSource: body.waterSource || null,
      fuelUsed: body.fuelUsed ? parseFloat(body.fuelUsed) : null,
      fuelCost: body.fuelCost ? parseFloat(body.fuelCost) : null,
      electricityCost: body.electricityCost ? parseFloat(body.electricityCost) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(log);
}

