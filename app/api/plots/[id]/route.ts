import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plot = await prisma.plot.findFirst({
    where: { id: params.id, userId: session.userId },
    include: {
      photos: true,
      notes: { include: { images: true, reminder: true }, orderBy: { date: 'desc' } },
      sprayLogs: { include: { images: true, reminder: true }, orderBy: { date: 'desc' } },
      expenses: { orderBy: { date: 'desc' } },
      activities: { include: { images: true }, orderBy: { date: 'desc' } },
      harvestEntries: { orderBy: { date: 'desc' } },
      irrigationLogs: { orderBy: { date: 'desc' } },
      reminders: { orderBy: { dueDate: 'asc' } },
      workerLogs: {
        include: { worker: true },
        orderBy: { date: 'desc' },
        take: 50,
      },
    },
  });

  if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
  return NextResponse.json(plot);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const plot = await prisma.plot.updateMany({
    where: { id: params.id, userId: session.userId },
    data: {
      name: body.name,
      areaBigha: body.areaBigha ? parseFloat(body.areaBigha) : undefined,
      variety: body.variety,
      plantingDate: body.plantingDate ? new Date(body.plantingDate) : undefined,
      status: body.status,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.plot.deleteMany({ where: { id: params.id, userId: session.userId } });
  return NextResponse.json({ success: true });
}
