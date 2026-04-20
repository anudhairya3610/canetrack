import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plots = await prisma.plot.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { harvestEntries: true, expenses: true } },
      harvestEntries: { select: { quantityQtl: true } },
      expenses: { select: { amount: true } },
    },
  });

  return NextResponse.json(plots);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, areaBigha, variety, plantingDate, status } = body;

  const plot = await prisma.plot.create({
    data: {
      userId: session.userId,
      name,
      areaBigha: parseFloat(areaBigha),
      variety,
      plantingDate: new Date(plantingDate),
      status: status || 'growing',
    },
  });

  return NextResponse.json(plot);
}
