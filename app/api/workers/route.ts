export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workers = await prisma.worker.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      attendances: {
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) } },
      },
      payments: { orderBy: { date: 'desc' }, take: 10 },
      advances: { where: { deducted: false } },
    },
  });

  return NextResponse.json(workers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, phone, workerType, wageRateType, wageAmount } = await req.json();
  const worker = await prisma.worker.create({
    data: {
      userId: session.userId,
      name,
      phone,
      workerType: workerType || 'daily',
      wageRateType: wageRateType || 'daily',
      wageAmount: parseFloat(wageAmount),
    },
  });

  return NextResponse.json(worker);
}

