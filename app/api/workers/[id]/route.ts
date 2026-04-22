export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkerType, WageRateType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const worker = await prisma.worker.findFirst({
      where: { id, userId: session.userId },
      include: {
        attendances: { orderBy: { date: 'desc' }, take: 365 },
        payments: { orderBy: { date: 'desc' } },
        advances: { orderBy: { date: 'desc' } },
        plotLogs: { include: { plot: true }, orderBy: { date: 'desc' }, take: 30 },
      },
    });

    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    return NextResponse.json(worker);
  } catch (error: any) {
    console.error('GET /api/workers/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch worker' },
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

    // Verify worker exists and belongs to user
    const existing = await prisma.worker.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Validate enums if provided
    const validWorkerTypes = Object.values(WorkerType);
    const validWageTypes = Object.values(WageRateType);

    const workerType = body.workerType && validWorkerTypes.includes(body.workerType)
      ? body.workerType
      : undefined;

    const wageRateType = body.wageRateType && validWageTypes.includes(body.wageRateType)
      ? body.wageRateType
      : undefined;

    // Validate wage amount if provided
    const wageAmount = body.wageAmount ? parseFloat(body.wageAmount) : undefined;
    if (wageAmount !== undefined && (isNaN(wageAmount) || wageAmount <= 0)) {
      return NextResponse.json({ error: 'Wage must be a positive number' }, { status: 400 });
    }

    await prisma.worker.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(workerType ? { workerType } : {}),
        ...(wageRateType ? { wageRateType } : {}),
        ...(wageAmount !== undefined ? { wageAmount } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/workers/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update worker' },
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

    // Verify worker exists and belongs to user
    const existing = await prisma.worker.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Delete related expenses (payments, advances, attendance)
    await prisma.expense.deleteMany({
      where: {
        userId: session.userId,
        sourceType: { in: ['payment', 'advance', 'attendance'] },
        sourceId: {
          in: await prisma.payment.findMany({ where: { workerId: id }, select: { id: true } })
            .then(payments => payments.map(p => p.id))
            .then(async paymentIds => {
              const advanceIds = await prisma.advance.findMany({ where: { workerId: id }, select: { id: true } }).then(a => a.map(a => a.id));
              const attendanceIds = await prisma.attendance.findMany({ where: { workerId: id }, select: { id: true } }).then(a => a.map(a => a.id));
              return [...paymentIds, ...advanceIds, ...attendanceIds];
            }),
        },
      },
    });

    // Delete worker (cascading handles attendances, payments, advances, plotLogs)
    await prisma.worker.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/workers/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete worker' },
      { status: 500 }
    );
  }
}