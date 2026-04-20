import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
// POST /api/bills/[id]/payments — record a payment against a bill
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { amount, date, mode, notes } = body;

  // Verify bill belongs to user via shop
  const bill = await prisma.bill.findFirst({
    where: { id: params.id, shop: { userId: session.userId } },
  });
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  const payment = await prisma.billPayment.create({
    data: {
      billId: params.id,
      amount: parseFloat(amount),
      date: new Date(date || Date.now()),
      mode: mode || 'cash',
      notes: notes || null,
    },
  });

  // Update the bill paid/due amounts
  const newPaid = bill.paidAmount + parseFloat(amount);
  const newDue = Math.max(0, bill.finalAmount - newPaid);
  const newStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'credit';

  await prisma.bill.update({
    where: { id: params.id },
    data: { paidAmount: newPaid, dueAmount: newDue, paymentStatus: newStatus },
  });

  return NextResponse.json(payment);
}
