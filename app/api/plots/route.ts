export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PlotStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const plots = await prisma.plot.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { harvestEntries: true, expenses: true } },
        harvestEntries: { select: { quantityQtl: true } },
        expenses: { select: { amount: true } },
      },
    });

    return NextResponse.json(plots);
  } catch (error: any) {
    console.error('GET /api/plots error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plots' },
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
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Plot name is required' }, { status: 400 });
    }

    const areaBigha = parseFloat(body.areaBigha);
    if (isNaN(areaBigha) || areaBigha <= 0) {
      return NextResponse.json({ error: 'Area must be a positive number' }, { status: 400 });
    }

    if (!body.variety || !body.variety.trim()) {
      return NextResponse.json({ error: 'Variety is required' }, { status: 400 });
    }

    if (!body.plantingDate) {
      return NextResponse.json({ error: 'Planting date is required' }, { status: 400 });
    }

    // Validate PlotStatus enum
    const validStatuses = Object.values(PlotStatus);
    const status = validStatuses.includes(body.status as PlotStatus)
      ? (body.status as PlotStatus)
      : PlotStatus.growing;

    const plot = await prisma.plot.create({
      data: {
        userId: session.userId,
        name: body.name.trim(),
        areaBigha,
        variety: body.variety.trim(),
        plantingDate: new Date(body.plantingDate),
        status,
      },
    });

    return NextResponse.json(plot, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/plots error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create plot' },
      { status: 500 }
    );
  }
}