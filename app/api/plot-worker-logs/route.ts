export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const log = await prisma.plotWorkerLog.create({
    data: {
      plotId: body.plotId,
      workerId: body.workerId,
      date: new Date(body.date || Date.now()),
      workNote: body.workNote || null,
      timeIn: body.timeIn || null,
      timeOut: body.timeOut || null,
    },
  });

  return NextResponse.json(log);
}

