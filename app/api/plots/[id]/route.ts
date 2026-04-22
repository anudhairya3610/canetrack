export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PlotStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const plot = await prisma.plot.findFirst({
      where: { id, userId: session.userId },
      include: {
        photos: true,
        notes: { include: { images: true, reminder: true }, orderBy: { date: 'desc' } },
        sprayLogs: { include: { images: true, reminder: true }, orderBy: { date: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
        activities: { include: { images: true }, orderBy: { date: 'desc' } },
        harvestEntries: { orderBy: { date: 'desc' } },
        irrigationLogs: { orderBy: { date: 'desc' } },
        reminders: { orderBy: { dueDate: 'asc' } },
        workerLogs: {
          include: { worker: true },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });

    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    return NextResponse.json(plot);
  } catch (error: any) {
    console.error('GET /api/plots/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plot' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Verify plot exists and belongs to user
    const existing = await prisma.plot.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    // Validate status if provided
    const validStatuses = Object.values(PlotStatus);
    const status = body.status && validStatuses.includes(body.status as PlotStatus)
      ? (body.status as PlotStatus)
      : undefined;

    // Validate areaBigha if provided
    const areaBigha = body.areaBigha ? parseFloat(body.areaBigha) : undefined;
    if (areaBigha !== undefined && (isNaN(areaBigha) || areaBigha <= 0)) {
      return NextResponse.json({ error: 'Area must be a positive number' }, { status: 400 });
    }

    await prisma.plot.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(areaBigha !== undefined ? { areaBigha } : {}),
        ...(body.variety ? { variety: body.variety.trim() } : {}),
        ...(body.plantingDate ? { plantingDate: new Date(body.plantingDate) } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/plots/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update plot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify plot exists and belongs to user
    const existing = await prisma.plot.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    // Delete related expenses first (that reference this plot)
    await prisma.expense.deleteMany({
      where: { plotId: id, userId: session.userId },
    });

    // Delete plot (cascading deletes handle photos, notes, sprays, etc.)
    await prisma.plot.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/plots/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete plot' },
      { status: 500 }
    );
  }
}