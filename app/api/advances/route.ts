import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const advance = await prisma.advance.create({
    data: {
      workerId: body.workerId,
      amount: parseFloat(body.amount),
      date: new Date(body.date || Date.now()),
      reason: body.reason || null,
      deducted: false,
    },
  });
  return NextResponse.json(advance);
}
