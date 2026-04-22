export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');

    const logs = await prisma.sprayLog.findMany({
      where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
      include: { images: true, reminder: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('GET /api/spray error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spray logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // --- Validation ---
    if (!body.plotId) {
      return NextResponse.json({ error: 'Plot is required' }, { status: 400 });
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findUnique({
      where: { id: body.plotId },
      select: { id: true, name: true, userId: true },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    if (plot.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const cost = body.cost ? parseFloat(body.cost) : null;
    if (cost !== null && (isNaN(cost) || cost < 0)) {
      return NextResponse.json({ error: 'Cost must be a positive number' }, { status: 400 });
    }

    const sprayDate = new Date(body.date || Date.now());
    const sprayType = body.sprayType || 'pesticide';
    const description = body.description || null;

    // If cost > 0: transaction (SprayLog + Expense)
    if (cost && cost > 0) {
      const result = await prisma.$transaction(async (tx) => {
        const log = await tx.sprayLog.create({
          data: {
            plotId: body.plotId,
            sprayType,
            description,
            cost,
            date: sprayDate,
          },
          include: { images: true },
        });

        await autoCreateExpense(tx, {
          userId: session.userId,
          plotId: body.plotId,
          category: 'spray',
          sourceType: 'sprayLog',
          sourceId: log.id,
          amount: cost,
          description: `Spray (${sprayType}) - ${plot.name}${description ? ': ' + description : ''}`,
          date: sprayDate,
        });

        return log;
      });

      return NextResponse.json(result, { status: 201 });
    }

    // No cost: just create SprayLog
    const log = await prisma.sprayLog.create({
      data: {
        plotId: body.plotId,
        sprayType,
        description,
        cost: cost || null,
        date: sprayDate,
      },
      include: { images: true },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/spray error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate expense already exists for this spray log' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create spray log' },
      { status: 500 }
    );
  }
}