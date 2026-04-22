export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';
import { ExpenseCategory, ExpenseSource, BillPaymentStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: shopId } = await params;

    // Verify shop belongs to user
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, userId: session.userId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const bills = await prisma.bill.findMany({
      where: { shopId },
      include: {
        items: true,
        payments: { orderBy: { date: 'desc' } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('GET /api/shops/[id]/bills error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: shopId } = await params;
    const body = await req.json();

    // --- Verify shop belongs to user ---
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, userId: session.userId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // --- Validation ---
    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const finalAmount = parseFloat(body.finalAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: 'Final amount must be a positive number' }, { status: 400 });
    }

    // Verify plot belongs to user if provided
    if (body.plotId) {
      const plot = await prisma.plot.findFirst({
        where: { id: body.plotId, userId: session.userId },
      });
      if (!plot) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      }
    }

    // Validate payment status
    const validStatuses = Object.values(BillPaymentStatus);
    const paymentStatus = validStatuses.includes(body.paymentStatus as BillPaymentStatus)
      ? (body.paymentStatus as BillPaymentStatus)
      : BillPaymentStatus.credit;

    const paidAmount = parseFloat(body.paidAmount) || 0;
    const dueAmount = parseFloat(body.dueAmount) || Math.max(0, finalAmount - paidAmount);
    const totalAmount = body.items.reduce((s: number, i: { totalPrice: number }) => s + (parseFloat(String(i.totalPrice)) || 0), 0);
    const discount = parseFloat(body.discount) || 0;
    const billDate = new Date(body.date);

    // Transaction: Bill + Items + Expense (if paid upfront)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create bill with items
      const bill = await tx.bill.create({
        data: {
          shopId,
          billNumber: body.billNumber || null,
          date: billDate,
          plotId: body.plotId || null,
          totalAmount,
          discount,
          finalAmount,
          paidAmount,
          dueAmount,
          paymentStatus,
          billPhotoUrl: body.billPhotoUrl || null,
          notes: body.notes || null,
          items: {
            create: body.items.map((item: {
              category?: string; itemName: string; quantity: number;
              unit?: string; pricePerUnit: number; totalPrice: number;
            }) => ({
              category: item.category || null,
              itemName: item.itemName,
              quantity: parseFloat(String(item.quantity)),
              unit: item.unit || null,
              pricePerUnit: parseFloat(String(item.pricePerUnit)),
              totalPrice: parseFloat(String(item.totalPrice)),
            })),
          },
        },
        include: { items: true },
      });

      // 2. Auto-create expense if paid upfront (paidAmount > 0)
      if (paidAmount > 0) {
        await autoCreateExpense(tx, {
          userId: session.userId,
          plotId: body.plotId || null,
          shopId,
          billId: bill.id,
          category: ExpenseCategory.purchase,
          sourceType: ExpenseSource.billPayment,
          sourceId: bill.id,
          amount: paidAmount,
          description: `Bill #${body.billNumber || 'N/A'} — ${shop.shopName} (initial payment)`,
          date: billDate,
        });
      }

      return bill;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/shops/[id]/bills error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense for this bill' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create bill' },
      { status: 500 }
    );
  }
}