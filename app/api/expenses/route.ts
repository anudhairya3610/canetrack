export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { ExpenseCategory } from '@prisma/client';
import {
  createExpense,
  getUserExpenses,
  getExpenseTotal,
  getExpensesByCategory,
} from '@/lib/services/expense.service';

// GET /api/expenses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId') || undefined;
    const shopId = searchParams.get('shopId') || undefined;
    const category = searchParams.get('category') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const view = searchParams.get('view'); // "total" | "byCategory" | null

    // Validate category if provided
    if (category && !Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Valid values: ${Object.values(ExpenseCategory).join(', ')}` },
        { status: 400 }
      );
    }

    // Return aggregate total
    if (view === 'total') {
      const total = await getExpenseTotal(session.userId, plotId);
      return NextResponse.json({ total });
    }

    // Return grouped by category
    if (view === 'byCategory') {
      const byCategory = await getExpensesByCategory(session.userId, plotId);
      return NextResponse.json({ byCategory });
    }

    // Return full list (default)
    const expenses = await getUserExpenses(session.userId, {
      plotId,
      shopId,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST /api/expenses — manual expense creation only
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // --- Validation ---
    if (!body.category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    if (!Object.values(ExpenseCategory).includes(body.category as ExpenseCategory)) {
      return NextResponse.json(
        { error: `Invalid category "${body.category}". Valid values: ${Object.values(ExpenseCategory).join(', ')}` },
        { status: 400 }
      );
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Create via expense service (sourceType = manual)
    const expense = await createExpense({
      userId: session.userId,
      plotId: body.plotId || null,
      shopId: body.shopId || null,
      category: body.category as ExpenseCategory,
      amount,
      description: body.description || null,
      date: new Date(body.date),
      receiptUrl: body.receiptUrl || null,
      sourceType: 'manual',
      sourceId: null,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense already exists for this source' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}