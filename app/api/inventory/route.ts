export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InventoryLogType } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const items = await prisma.inventoryItem.findMany({
      where: { userId: session.userId },
      include: { logs: { orderBy: { date: 'desc' }, take: 20 } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // ========== ADD ITEM ==========
    if (body.action === 'add_item') {
      if (!body.itemName || !body.itemName.trim()) {
        return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
      }

      const currentStock = parseFloat(body.currentStock) || 0;
      if (currentStock < 0) {
        return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 });
      }

      const item = await prisma.inventoryItem.create({
        data: {
          userId: session.userId,
          itemName: body.itemName.trim(),
          category: body.category || null,
          currentStock,
          unit: body.unit || null,
        },
      });

      return NextResponse.json(item, { status: 201 });
    }

    // ========== LOG USAGE ==========
    if (body.action === 'log') {
      if (!body.itemId) {
        return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
      }

      const quantity = parseFloat(body.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
      }

      // Validate log type
      const validLogTypes = Object.values(InventoryLogType);
      const logType = validLogTypes.includes(body.type as InventoryLogType)
        ? (body.type as InventoryLogType)
        : null;

      if (!logType) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validLogTypes.join(', ')}` },
          { status: 400 }
        );
      }

      // Verify item belongs to user
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { id: body.itemId, userId: session.userId },
      });

      if (!existingItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
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

      // Determine stock change
      const isIncoming = logType === 'purchase' || logType === 'returned';
      const stockChange = isIncoming ? quantity : -quantity;

      // Prevent negative stock
      if (!isIncoming && existingItem.currentStock < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${existingItem.currentStock}` },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.update({
          where: { id: body.itemId },
          data: { currentStock: { increment: stockChange } },
        });

        const log = await tx.inventoryLog.create({
          data: {
            inventoryItemId: body.itemId,
            type: logType,
            quantity,
            date: new Date(body.date || Date.now()),
            plotId: body.plotId || null,
            notes: body.notes || null,
          },
        });

        return { item, log };
      });

      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action. Use "add_item" or "log"' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process inventory' },
      { status: 500 }
    );
  }
}