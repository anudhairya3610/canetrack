export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');

    const entries = await prisma.harvestEntry.findMany({
      where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
      include: { plot: { select: { name: true, areaBigha: true } } },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('GET /api/harvest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch harvest entries' },
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

    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const quantity = parseFloat(body.quantityQtl);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findUnique({
      where: { id: body.plotId },
      select: { id: true, userId: true },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    if (plot.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const entry = await prisma.harvestEntry.create({
      data: {
        plotId: body.plotId,
        date: new Date(body.date),
        quantityQtl: quantity,
        vehicleNumber: body.vehicleNumber || null,
        tokenNumber: body.tokenNumber || null,
        millName: body.millName || null,
        harvesterType: body.harvesterType || null,
        notes: body.notes || null,
      },
      include: { plot: { select: { name: true } } },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/harvest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create harvest entry' },
      { status: 500 }
    );
  }
}