import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';
import { ExpenseCategory, ExpenseSource } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// POST /api/bills/[id]/payments — record a payment against a bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: billId } = await params;
    const body = await req.json();
    const { amount, date, mode, notes } = body;

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify bill belongs to user via shop
    const bill = await prisma.bill.findFirst({
      where: { id: billId, shop: { userId: session.userId } },
      include: { shop: { select: { id: true } } },
    });
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Calculate new bill totals
    const newPaid = bill.paidAmount + parsedAmount;
    const newDue = Math.max(0, bill.finalAmount - newPaid);
    const newStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'credit';

    // Transaction: BillPayment + Bill update + Expense
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create bill payment
      const payment = await tx.billPayment.create({
        data: {
          billId,
          amount: parsedAmount,
          date: new Date(date || Date.now()),
          mode: mode || 'cash',
          notes: notes || null,
        },
      });

      // 2. Update bill paid/due amounts
      await tx.bill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentStatus: newStatus,
        },
      });

      // 3. Auto-create expense
      await autoCreateExpense(tx, {
        userId: session.userId,
        plotId: bill.plotId || null,
        shopId: bill.shop.id,
        billId: bill.id,
        category: ExpenseCategory.purchase,
        sourceType: ExpenseSource.billPayment,
        sourceId: payment.id,
        amount: parsedAmount,
        description: `Bill payment${notes ? ': ' + notes : ''}`,
        date: new Date(date || Date.now()),
      });

      return payment;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bill payment error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense entry for this payment' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to record bill payment' },
      { status: 500 }
    );
  }
}