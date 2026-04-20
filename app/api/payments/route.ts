import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const payment = await prisma.payment.create({
    data: {
      workerId: body.workerId,
      amount: parseFloat(body.amount),
      periodFrom: body.periodFrom ? new Date(body.periodFrom) : null,
      periodTo: body.periodTo ? new Date(body.periodTo) : null,
      mode: body.mode || 'cash',
      date: new Date(body.date || Date.now()),
      notes: body.notes || null,
    },
  });
  return NextResponse.json(payment);
}
