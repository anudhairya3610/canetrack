import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { billNumber, date, plotId, items, discount, finalAmount, paidAmount, dueAmount, paymentStatus, billPhotoUrl, notes } = body;

  const bill = await prisma.bill.create({
    data: {
      shopId: params.id,
      billNumber: billNumber || null,
      date: new Date(date),
      plotId: plotId || null,
      totalAmount: items.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0),
      discount: parseFloat(discount) || 0,
      finalAmount: parseFloat(finalAmount),
      paidAmount: parseFloat(paidAmount) || 0,
      dueAmount: parseFloat(dueAmount) || 0,
      paymentStatus: paymentStatus || 'credit',
      billPhotoUrl: billPhotoUrl || null,
      notes: notes || null,
      items: {
        create: items.map((item: {
          category?: string; itemName: string; quantity: number; unit?: string; pricePerUnit: number; totalPrice: number;
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

  return NextResponse.json(bill);
}
