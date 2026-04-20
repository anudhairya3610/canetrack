import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const worker = await prisma.worker.findFirst({
    where: { id: params.id, userId: session.userId },
    include: {
      attendances: { orderBy: { date: 'desc' }, take: 365 },
      payments: { orderBy: { date: 'desc' } },
      advances: { orderBy: { date: 'desc' } },
      plotLogs: { include: { plot: true }, orderBy: { date: 'desc' }, take: 30 },
    },
  });

  if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
  return NextResponse.json(worker);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await prisma.worker.updateMany({
    where: { id: params.id, userId: session.userId },
    data: {
      name: body.name,
      phone: body.phone,
      workerType: body.workerType,
      wageRateType: body.wageRateType,
      wageAmount: body.wageAmount ? parseFloat(body.wageAmount) : undefined,
      isActive: body.isActive,
    },
  });

  return NextResponse.json({ success: true });
}
