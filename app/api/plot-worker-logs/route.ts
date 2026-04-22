export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';
import { ExpenseCategory, ExpenseSource } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');
    const workerId = searchParams.get('workerId');

    const logs = await prisma.plotWorkerLog.findMany({
      where: {
        plot: { userId: session.userId },
        ...(plotId ? { plotId } : {}),
        ...(workerId ? { workerId } : {}),
      },
      include: {
        plot: { select: { name: true } },
        worker: { select: { name: true, wageAmount: true, wageRateType: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('GET /api/plot-worker-logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch worker logs' },
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

    if (!body.workerId) {
      return NextResponse.json({ error: 'Worker is required' }, { status: 400 });
    }

    // Verify plot belongs to user
    const plot = await prisma.plot.findFirst({
      where: { id: body.plotId, userId: session.userId },
      select: { id: true, name: true },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    // Verify worker belongs to user + get wage info
    const worker = await prisma.worker.findFirst({
      where: { id: body.workerId, userId: session.userId },
      select: { id: true, name: true, wageAmount: true, wageRateType: true },
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Determine wage for this assignment
    const isHalfDay = body.status === 'halfDay';
    const customWage = body.wageAmount ? parseFloat(body.wageAmount) : null;
    const baseWage = customWage || worker.wageAmount;
    const actualWage = isHalfDay ? baseWage / 2 : baseWage;
    const status = isHalfDay ? 'halfDay' : 'present';
    const paidToday = body.paidToday || false;
    const workDate = new Date(body.date || Date.now());
    workDate.setHours(12, 0, 0, 0);

    // Transaction: PlotWorkerLog + Attendance + Expense
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create PlotWorkerLog (which plot, which worker, which day)
      const log = await tx.plotWorkerLog.create({
        data: {
          plotId: body.plotId,
          workerId: body.workerId,
          date: workDate,
          workNote: body.workNote || null,
          timeIn: body.timeIn || null,
          timeOut: body.timeOut || null,
        },
        include: {
          worker: { select: { name: true, wageAmount: true } },
          plot: { select: { name: true } },
        },
      });

      // 2. Upsert Attendance (mark worker present/halfDay for this date)
      const attendance = await tx.attendance.upsert({
        where: {
          workerId_date: { workerId: body.workerId, date: workDate },
        },
        update: {
          status,
          dailyWage: actualWage,
          paidToday,
          paidAmount: paidToday ? actualWage : 0,
          checkIn: body.timeIn || null,
          checkOut: body.timeOut || null,
        },
        create: {
          workerId: body.workerId,
          date: workDate,
          status,
          dailyWage: actualWage,
          paidToday,
          paidAmount: paidToday ? actualWage : 0,
          checkIn: body.timeIn || null,
          checkOut: body.timeOut || null,
          overtimeHours: 0,
          overtimeRate: 0,
        },
      });

      // 3. Auto-create expense under this PLOT (category: labour)
      // Use attendance ID as sourceId to prevent duplicates
      const existingExpense = await tx.expense.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: 'attendance',
            sourceId: attendance.id,
          },
        },
      });

      if (existingExpense) {
        // Update existing expense (worker may have been re-assigned)
        await tx.expense.update({
          where: { id: existingExpense.id },
          data: {
            amount: actualWage,
            plotId: body.plotId,
            description: `${worker.name} - ${isHalfDay ? 'half day' : 'full day'} @ ${plot.name}`,
            date: workDate,
          },
        });
      } else {
        // Create new expense linked to this plot
        await autoCreateExpense(tx, {
          userId: session.userId,
          plotId: body.plotId,
          category: ExpenseCategory.labour,
          sourceType: ExpenseSource.attendance,
          sourceId: attendance.id,
          amount: actualWage,
          description: `${worker.name} - ${isHalfDay ? 'half day' : 'full day'} @ ${plot.name}`,
          date: workDate,
        });
      }

      return {
        log,
        attendance,
        wage: actualWage,
        status,
        paidToday,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/plot-worker-logs error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to assign worker to plot' },
      { status: 500 }
    );
  }
}