import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.userId },
    include: { logs: { orderBy: { date: 'desc' }, take: 20 } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  if (body.action === 'add_item') {
    const item = await prisma.inventoryItem.create({
      data: {
        userId: session.userId,
        itemName: body.itemName,
        category: body.category || null,
        currentStock: parseFloat(body.currentStock) || 0,
        unit: body.unit || null,
      },
    });
    return NextResponse.json(item);
  }

  if (body.action === 'log') {
    const [item, log] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: body.itemId },
        data: {
          currentStock: {
            increment: body.type === 'in' ? parseFloat(body.quantity) : -parseFloat(body.quantity),
          },
        },
      }),
      prisma.inventoryLog.create({
        data: {
          inventoryItemId: body.itemId,
          type: body.type,
          quantity: parseFloat(body.quantity),
          date: new Date(body.date || Date.now()),
          plotId: body.plotId || null,
          notes: body.notes || null,
        },
      }),
    ]);
    return NextResponse.json({ item, log });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
