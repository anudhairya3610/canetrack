export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // --- Validation ---
    if (!body.workerId) {
      return NextResponse.json({ error: 'Worker is required' }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Fetch worker to verify ownership
    const worker = await prisma.worker.findUnique({
      where: { id: body.workerId },
      select: { id: true, name: true, userId: true },
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    if (worker.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const paymentDate = new Date(body.date || Date.now());

    // Transaction: create Payment + auto-create Expense
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workerId: body.workerId,
          amount,
          periodFrom: body.periodFrom ? new Date(body.periodFrom) : null,
          periodTo: body.periodTo ? new Date(body.periodTo) : null,
          mode: body.mode || 'cash',
          date: paymentDate,
          notes: body.notes || null,
        },
      });

      // Auto-create linked expense
      const expense = await autoCreateExpense(tx, {
        userId: session.userId,
        category: 'labour',
        sourceType: 'payment',
        sourceId: payment.id,
        amount,
        description: `Payment to ${worker.name}`,
        date: paymentDate,
      });

      return { payment, expense };
    });

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/payments error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense already exists for this payment' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}