import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plotId = searchParams.get('plotId');
  const shopId = searchParams.get('shopId');
  const category = searchParams.get('category');

  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.userId,
      ...(plotId ? { plotId } : {}),
      ...(shopId ? { shopId } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { date: 'desc' },
    include: { plot: { select: { name: true } }, shop: { select: { shopName: true } } },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      userId: session.userId,
      plotId: body.plotId || null,
      shopId: body.shopId || null,
      billId: body.billId || null,
      category: body.category,
      amount: parseFloat(body.amount),
      description: body.description,
      date: new Date(body.date),
      receiptUrl: body.receiptUrl || null,
      isRecurring: body.isRecurring || false,
      recurringType: body.recurringType || null,
    },
  });

  return NextResponse.json(expense);
}
