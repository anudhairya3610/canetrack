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

    const advanceDate = new Date(body.date || Date.now());

    // Transaction: create Advance + auto-create Expense
    const result = await prisma.$transaction(async (tx) => {
      const advance = await tx.advance.create({
        data: {
          workerId: body.workerId,
          amount,
          date: advanceDate,
          reason: body.reason || null,
          deducted: false,
        },
      });

      await autoCreateExpense(tx, {
        userId: session.userId,
        category: 'advance',
        sourceType: 'advance',
        sourceId: advance.id,
        amount,
        description: `Advance to ${worker.name}${body.reason ? ': ' + body.reason : ''}`,
        date: advanceDate,
      });

      return advance;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/advances error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense already exists for this advance' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create advance' },
      { status: 500 }
    );
  }
}