export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';
import {
  ExpenseCategory,
  ExpenseSource,
  IrrigationType,
} from '@prisma/client';

// GET /api/irrigation — list irrigation logs for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');

    const logs = await prisma.irrigationLog.findMany({
      where: {
        plot: { userId: session.userId },
        ...(plotId ? { plotId } : {}),
      },
      orderBy: { date: 'desc' },
      include: {
        plot: { select: { name: true } },
      },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Irrigation GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch irrigation logs' },
      { status: 500 }
    );
  }
}

// POST /api/irrigation — create irrigation log + auto-expense
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plotId, irrigationType, durationHours, waterSource, fuelUsed, fuelCost, electricityCost, notes } = body;

    // Validate required fields
    if (!plotId || !irrigationType) {
      return NextResponse.json(
        { error: 'plotId and irrigationType are required' },
        { status: 400 }
      );
    }

    // Validate irrigationType enum
    const validTypes = Object.values(IrrigationType);
    if (!validTypes.includes(irrigationType as IrrigationType)) {
      return NextResponse.json(
        { error: `Invalid irrigationType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findFirst({
      where: { id: plotId, userId: session.userId },
    });
    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    // Parse costs
    const parsedFuelCost = fuelCost ? parseFloat(fuelCost) : 0;
    const parsedElectricityCost = electricityCost ? parseFloat(electricityCost) : 0;
    const totalCost = parsedFuelCost + parsedElectricityCost;

    // Transaction: IrrigationLog + Expense (if cost > 0)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create irrigation log
      const log = await tx.irrigationLog.create({
        data: {
          plotId,
          date: new Date(body.date || Date.now()),
          irrigationType: irrigationType as IrrigationType,
          durationHours: durationHours ? parseFloat(durationHours) : null,
          waterSource: waterSource || null,
          fuelUsed: fuelUsed ? parseFloat(fuelUsed) : null,
          fuelCost: parsedFuelCost || null,
          electricityCost: parsedElectricityCost || null,
          notes: notes || null,
        },
        include: {
          plot: { select: { name: true } },
        },
      });

      // 2. Auto-create expense if cost > 0
      if (totalCost > 0) {
        const costParts = [];
        if (parsedFuelCost > 0) costParts.push(`Fuel: ₹${parsedFuelCost}`);
        if (parsedElectricityCost > 0) costParts.push(`Electricity: ₹${parsedElectricityCost}`);

        await autoCreateExpense(tx, {
          userId: session.userId,
          plotId,
          category: ExpenseCategory.irrigation,
          sourceType: ExpenseSource.irrigationLog,
          sourceId: log.id,
          amount: totalCost,
          description: `Irrigation (${irrigationType}) — ${costParts.join(', ')}`,
          date: new Date(body.date || Date.now()),
        });
      }

      return log;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Irrigation POST error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense entry for this irrigation log' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create irrigation log' },
      { status: 500 }
    );
  }
}